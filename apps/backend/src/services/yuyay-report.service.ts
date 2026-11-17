import { prisma } from '../prisma/client';
import { sendMetaWhatsAppMessage } from './meta-whatsapp.service';
import { normalizePeruPhone } from './yuyay-call.service';
import { formatLimaLongDate, formatLimaTime, getLimaStartOfDay } from './yuyay-time';

interface MedConfirmation {
  name: string;
  taken: boolean;
  reason?: string | null;
}

const readMeds = (value: unknown): MedConfirmation[] =>
  Array.isArray(value)
    ? value.filter(
        (m): m is MedConfirmation =>
          typeof m === 'object' && m !== null && typeof (m as MedConfirmation).name === 'string'
      )
    : [];

/**
 * Genera y envía el reporte diario consolidado (20:30 hrs) al WhatsApp del hijo cuidador.
 */
export const sendDailyNightReportForFamily = async (familyId: string): Promise<boolean> => {
  // "Hoy" en hora de Lima: el servidor suele estar en UTC.
  const startOfToday = getLimaStartOfDay();
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      elderly: {
        include: {
          callLogs: {
            where: {
              createdAt: {
                gte: startOfWeek, // últimos 7 días (hoy se filtra abajo)
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      members: {
        where: {
          isActive: true,
          phone: { not: null },
          role: 'primary_caregiver',
        },
      },
    },
  });

  if (!family || !family.elderly || family.members.length === 0) {
    console.warn(`[Yuyay Report] Familia ${familyId} sin datos completos o cuidador con teléfono.`);
    return false;
  }

  const senior = family.elderly;
  const caregiver = family.members[0];
  const weekCalls = senior.callLogs || [];
  const todayCalls = weekCalls.filter((c) => c.createdAt >= startOfToday);
  const answeredToday = todayCalls.filter((c) => c.status === 'answered');

  // Adherencia real de los últimos 7 días: tomas confirmadas / tomas preguntadas.
  const weekMeds = weekCalls.flatMap((c) => readMeds(c.medsConfirmed));
  const weeklyAdherence =
    weekMeds.length > 0 ? Math.round((weekMeds.filter((m) => m.taken).length / weekMeds.length) * 100) : null;

  // Calcular tomas confirmadas
  const confirmedMeds: string[] = [];
  const missedMeds: string[] = [];
  let reportedMood = 'Tranquilo y sereno';
  let reportedSymptoms = 'Sin molestias reportadas';

  for (const call of todayCalls) {
    if (call.mood) reportedMood = call.mood;
    if (call.symptoms && call.symptoms !== 'Ninguno') reportedSymptoms = call.symptoms;

    const meds = readMeds(call.medsConfirmed);
    for (const med of meds) {
      const timeStr = formatLimaTime(call.createdAt);

      if (med.taken) {
        confirmedMeds.push(`✅ ${timeStr} — *${med.name}* (Confirmado)`);
      } else {
        missedMeds.push(`⚠️ ${timeStr} — *${med.name}* (${med.reason || 'No tomada'})`);
      }
    }
  }

  const dateStr = formatLimaLongDate(new Date());

  const reportText =
    `🌿 *Reporte Nocturno Yuyay — ${senior.name}*\n` +
    `📅 _${dateStr}_\n\n` +
    `💊 *Supervisión de Medicamentos:*\n` +
    (confirmedMeds.length > 0 ? confirmedMeds.join('\n') + '\n' : '• Sin tomas registradas hoy.\n') +
    (missedMeds.length > 0 ? '\n*Tomas pendientes/omitidas:*\n' + missedMeds.join('\n') + '\n' : '') +
    `\n😊 *Estado de ánimo:* ${reportedMood}\n` +
    `🩺 *Bienestar físico:* ${reportedSymptoms}\n` +
    `📞 *Llamadas contestadas hoy:* ${answeredToday.length}\n\n` +
    (weeklyAdherence !== null ? `📊 *Adherencia de los últimos 7 días:* ${weeklyAdherence}%\n\n` : '') +
    `_Yuyay: Cuidando a quienes cuidaron de ti._`;

  if (caregiver.phone) {
    const cleanPhone = normalizePeruPhone(caregiver.phone);
    try {
      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: reportText,
      });
      console.log(`[Yuyay Report] 📋 Reporte nocturno enviado a ${caregiver.name} (${cleanPhone})`);
      return true;
    } catch (err: any) {
      console.error(`[Yuyay Report] Error enviando reporte a ${cleanPhone}:`, err.message || err);
      return false;
    }
  }

  return false;
};

/**
 * Recorre todas las familias activas y dispara el reporte diario consolidado a las 20:30
 */
export const runDailyNightReportJob = async (): Promise<{ totalSent: number }> => {
  console.log('[Yuyay Report] 🌙 Iniciando corrida de reportes nocturnos para todas las familias...');
  const families = await prisma.family.findMany({
    // Solo familias inscritas en Yuyay (con llamadas programadas y consentimiento),
    // no todas las familias de la app Ayni Care.
    where: {
      elderly: {
        is: {
          consentVerbal: true,
          scheduledCalls: { some: {} },
        },
      },
    },
  });

  let totalSent = 0;
  for (const fam of families) {
    const ok = await sendDailyNightReportForFamily(fam.id);
    if (ok) totalSent++;
  }

  return { totalSent };
};
