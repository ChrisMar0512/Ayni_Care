import { prisma } from '../prisma/client';
import {
  getGeminiClient,
  callGeminiWithFallback,
  MODEL_CANDIDATES,
} from './ai.service';
import { sendMetaWhatsAppMessage } from './meta-whatsapp.service';

// Memoria de números a los que se les envió el sondeo semanal recientemente
const awaitingPulseAnswers = new Set<string>();

/**
 * Envía el micro-sondeo proactivo semanal a todas las familias activas
 */
export const sendWeeklyPulseCheckToAllFamilies = async (): Promise<{ sentCount: number }> => {
  console.log('[PulseCheck] 📢 Iniciando envío de micro-sondeo semanal a familias activas...');

  const activeMembers = await prisma.familyMember.findMany({
    where: {
      isActive: true,
      phone: { not: null },
      role: 'primary_caregiver',
    },
    include: {
      family: {
        include: { elderly: true },
      },
    },
  });

  let sentCount = 0;

  for (const member of activeMembers) {
    if (!member.phone) continue;

    const elderlyName = member.family?.elderly?.name || 'tu ser querido';
    const cleanPhone = member.phone.replace(/\D/g, '');

    const questionText =
      `🌿 *Consulta semanal de Ayni:*\n\n` +
      `¡Hola, ${member.name}! Para ayudarte mejor a ti y a tu familia: *¿Qué fue lo más pesado o complicado de coordinar esta semana con ${elderlyName}?*\n\n` +
      `1️⃣ Conseguir/comprar las medicinas o pañales\n` +
      `2️⃣ Falta de tiempo o cansancio del cuidador\n` +
      `3️⃣ Las cuentas y gastos entre hermanos\n` +
      `4️⃣ Consultas con doctores o dudas médicas\n\n` +
      `_(Puedes responder con el número 1, 2, 3, 4 o escribir libremente/mandar un audio breve)_`;

    try {
      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: questionText,
      });

      awaitingPulseAnswers.add(cleanPhone);
      sentCount++;
    } catch (err: any) {
      console.warn(`[PulseCheck] No se pudo enviar sondeo a ${cleanPhone}:`, err.message || err);
    }
  }

  console.log(`[PulseCheck] ✅ Micro-sondeo enviado a ${sentCount} cuidadores.`);
  return { sentCount };
};

/**
 * Verifica si un mensaje entrante corresponde a la respuesta de un sondeo semanal
 */
export const isAwaitingPulseCheck = (phone: string, text: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (awaitingPulseAnswers.has(cleanPhone)) return true;

  const t = text.trim();
  // Si el usuario responde directamente con un número "1", "2", "3", "4"
  if (/^[1-4]$/.test(t) || t.startsWith('opcion 1') || t.startsWith('opción 1')) {
    return true;
  }

  return false;
};

/**
 * Procesa y clasifica la respuesta al micro-sondeo semanal
 */
export const processPulseAnswer = async ({
  familyId,
  memberId,
  phone,
  rawAnswer,
}: {
  familyId: string;
  memberId: string;
  phone: string;
  rawAnswer: string;
}): Promise<string> => {
  const cleanPhone = phone.replace(/\D/g, '');
  awaitingPulseAnswers.delete(cleanPhone);

  const text = rawAnswer.trim();

  let topFriction = 'other';
  let details = text;

  if (text === '1' || text.toLowerCase().includes('medicina') || text.toLowerCase().includes('pañal')) {
    topFriction = 'medication_procurement';
    details = 'Conseguir/comprar medicinas o insumos';
  } else if (text === '2' || text.toLowerCase().includes('tiempo') || text.toLowerCase().includes('cansancio') || text.toLowerCase().includes('sola')) {
    topFriction = 'caregiver_fatigue';
    details = 'Falta de tiempo o sobrecarga/cansancio del cuidador';
  } else if (text === '3' || text.toLowerCase().includes('cuenta') || text.toLowerCase().includes('gasto') || text.toLowerCase().includes('dinero') || text.toLowerCase().includes('hermano')) {
    topFriction = 'family_finances';
    details = 'Cuentas y división de gastos entre hermanos';
  } else if (text === '4' || text.toLowerCase().includes('doctor') || text.toLowerCase().includes('médic') || text.toLowerCase().includes('cita')) {
    topFriction = 'clinical_confusion';
    details = 'Consultas con doctores o dudas clínicas';
  } else {
    // Si escribió un texto libre o largo, clasificar con Gemini
    try {
      const gemini = getGeminiClient();
      const prompt = `
Analiza la respuesta de este usuario a la pregunta de qué fue lo más difícil esta semana en el cuidado de su adulto mayor:
Respuesta: "${text}"

Clasifica estrictamente en una de estas categorías:
- "medication_procurement" (comprar pastillas, farmacia, recetas, pañales)
- "caregiver_fatigue" (estrés, falta de tiempo, no hay quién ayude, cuidadora faltó)
- "family_finances" (dinero, hermanos no pagan, gastos altos)
- "clinical_confusion" (enfermedad, dudas de salud, citas médicas)
- "other"

Devuelve JSON: { "topFriction": string, "summary": string }
`;
      const aiRes = await callGeminiWithFallback(gemini, MODEL_CANDIDATES, {
        contents: [{ text: prompt }],
        config: { responseMimeType: 'application/json' },
      });
      const p = JSON.parse(aiRes.text || '{}');
      topFriction = p.topFriction || 'other';
      details = p.summary || text;
    } catch (e) {
      topFriction = 'other';
      details = text;
    }
  }

  // Guardar en Base de Datos
  await prisma.weeklyPulseResponse.create({
    data: {
      familyId,
      memberId,
      phone: cleanPhone,
      question: '¿Qué fue lo más pesado o complicado de coordinar esta semana?',
      rawAnswer: text,
      topFriction,
      details,
    },
  });

  console.log(`[PulseCheck] 📊 Respuesta guardada: [${topFriction}] -> "${details}"`);

  return (
    `🌿 *¡Muchas gracias por compartirlo!*\n\n` +
    `He tomado nota de esto. En Ayni estamos trabajando para que esta parte sea cada vez más sencilla para ti y tu familia.\n\n` +
    `¿Deseas que anote alguna indicación o tarea para hoy? ¡Aquí estoy para ayudarte!`
  );
};
