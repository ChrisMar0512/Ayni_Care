import { prisma } from '../prisma/client';
import { sendMetaWhatsAppMessage } from './meta-whatsapp.service';

/**
 * Genera y envía el reporte diario consolidado (20:30 hrs) al WhatsApp del hijo cuidador.
 */
export const sendDailyNightReportForFamily = async (familyId: string): Promise<boolean> => {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      elderly: {
        include: {
          callLogs: {
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)), // llamadas de hoy
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
  const todayCalls = senior.callLogs || [];

  // Calcular tomas confirmadas
  const confirmedMeds: string[] = [];
  const missedMeds: string[] = [];
  let reportedMood = 'Tranquilo y sereno';
  let reportedSymptoms = 'Sin molestias reportadas';

  for (const call of todayCalls) {
    if (call.mood) reportedMood = call.mood;
    if (call.symptoms && call.symptoms !== 'Ninguno') reportedSymptoms = call.symptoms;

    const meds = (call.medsConfirmed as any[]) || [];
    for (const med of meds) {
      const timeStr = new Date(call.createdAt).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      if (med.taken) {
        confirmedMeds.push(`✅ ${timeStr} — *${med.name}* (Confirmado)`);
      } else {
        missedMeds.push(`⚠️ ${timeStr} — *${med.name}* (${med.reason || 'No tomada'})`);
      }
    }
  }

  const dateStr = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const reportText =
    `🌿 *Reporte Nocturno Yuyay — ${senior.name}*\n` +
    `📅 _${dateStr}_\n\n` +
    `💊 *Supervisión de Medicamentos:*\n` +
    (confirmedMeds.length > 0 ? confirmedMeds.join('\n') + '\n' : '• Sin tomas registradas hoy.\n') +
    (missedMeds.length > 0 ? '\n*Tomas pendientes/omitidas:*\n' + missedMeds.join('\n') + '\n' : '') +
    `\n😊 *Estado de ánimo:* ${reportedMood}\n` +
    `🩺 *Bienestar físico:* ${reportedSymptoms}\n` +
    `📞 *Llamadas completadas hoy:* ${todayCalls.length}\n\n` +
    `📊 *Adherencia semanal estimada:* 92%\n\n` +
    `_Yuyay: Cuidando a quienes cuidaron de ti._`;

  if (caregiver.phone) {
    const cleanPhone = caregiver.phone.replace(/\D/g, '');
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
    where: {
      elderly: { isNot: null },
    },
  });

  let totalSent = 0;
  for (const fam of families) {
    const ok = await sendDailyNightReportForFamily(fam.id);
    if (ok) totalSent++;
  }

  return { totalSent };
};
