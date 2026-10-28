import { prisma } from '../prisma/client';
import { getGeminiClient, callGeminiWithFallback, MODEL_CANDIDATES } from './ai.service';
import { sendMetaWhatsAppMessage } from './meta-whatsapp.service';

export interface MicroCallContext {
  seniorName: string;
  timeSlot: 'mañana' | 'tarde' | 'noche';
  medications: Array<{
    name: string;
    dosage: string;
    instructions?: string | null;
  }>;
  lastMood?: string | null;
  conditions: string[];
}

export interface ExtractedCallResult {
  medsConfirmed: Array<{
    name: string;
    taken: boolean;
    reason?: string | null;
  }>;
  mood: string;
  symptoms: string;
  hasRedFlag: boolean;
  redFlagReason?: string | null;
}

/**
 * 1. Genera un micro-contexto (menos de 150 tokens) para la llamada de voz saliente.
 * Evita sobrecostos y reduce latencia en el agente de voz.
 */
export const buildMicroContextForCall = async (
  elderlyId: string,
  timeSlot: 'mañana' | 'tarde' | 'noche' = 'mañana'
): Promise<MicroCallContext | null> => {
  const elderly = await prisma.elderlyPerson.findUnique({
    where: { id: elderlyId },
    include: {
      family: {
        include: {
          medications: {
            where: { isActive: true },
          },
        },
      },
      callLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!elderly) return null;

  // Filtrar o mapear medicamentos activos
  const relevantMeds = elderly.family.medications.map((m) => ({
    name: m.name,
    dosage: m.dosage,
    instructions: m.instructions,
  }));

  const lastMood = elderly.callLogs[0]?.mood || null;

  return {
    seniorName: elderly.name,
    timeSlot,
    medications: relevantMeds,
    lastMood,
    conditions: elderly.conditions,
  };
};

/**
 * 2. Analiza la transcripción de la llamada con Gemini Flash usando micro-tokens.
 * Detecta tomas de medicamentos, estado anímico y señales de alarma médica (Red Flags).
 */
export const analyzeCallTranscript = async (
  transcript: string,
  expectedMeds: string[] = []
): Promise<ExtractedCallResult> => {
  const gemini = getGeminiClient();

  const prompt = `
Eres el motor clínico de teleasistencia de Yuyay (Perú).
Analiza la siguiente transcripción de una llamada breve de teleasistencia con un adulto mayor.

Medicamentos esperados en esta llamada: ${expectedMeds.join(', ') || 'Medicamentos habituales'}

Transcripción de la llamada:
"""${transcript}"""

Extrae ÚNICAMENTE un objeto JSON válido con este formato exacto:
{
  "medsConfirmed": [
    { "name": "nombre del medicamento", "taken": true/false, "reason": "motivo si no la tomó o null" }
  ],
  "mood": "resumen en 3 a 5 palabras del estado anímico (ej. 'Tranquilo y buen ánimo', 'Cansado', 'Preocupado')",
  "symptoms": "síntomas físicos o molestias mencionadas o 'Sin síntomas reportados'",
  "hasRedFlag": true si el paciente mencionó dolor de pecho/opresión, mareo intenso, caída reciente, visión borrosa, falta de aire o desorientación severa; de lo contrario false,
  "redFlagReason": "descripción breve del síntoma de alarma si hasRedFlag es true, de lo contrario null"
}
`;

  try {
    const response = await callGeminiWithFallback(gemini, MODEL_CANDIDATES, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const text = response?.text || '{}';
    const parsed: ExtractedCallResult = JSON.parse(text);

    return {
      medsConfirmed: parsed.medsConfirmed || [],
      mood: parsed.mood || 'Estable',
      symptoms: parsed.symptoms || 'Ninguno',
      hasRedFlag: Boolean(parsed.hasRedFlag),
      redFlagReason: parsed.redFlagReason || null,
    };
  } catch (err: any) {
    console.error('[Yuyay Call Service] Error extrayendo datos con Gemini:', err.message || err);
    // Fallback defensivo
    const hasEmergencyKeywords = /pecho|mareo|ca[ií]|desmay|aire|borros/i.test(transcript);
    return {
      medsConfirmed: [],
      mood: 'No determinado',
      symptoms: 'Revisión requerida',
      hasRedFlag: hasEmergencyKeywords,
      redFlagReason: hasEmergencyKeywords ? 'Palabras clave de riesgo detectadas en el audio' : null,
    };
  }
};

/**
 * 3. Dispara una notificación de alerta inmediata (Bandera Roja) por WhatsApp al hijo cuidador.
 */
export const triggerImmediateRedFlagAlert = async (params: {
  childPhone: string;
  childName: string;
  seniorName: string;
  reason: string;
  transcriptSnippet?: string;
}): Promise<boolean> => {
  const { childPhone, childName, seniorName, reason, transcriptSnippet } = params;

  const alertMessage =
    `🚨 *ALERTA MÉDICA PREVENTIVA — YUYAY*\n\n` +
    `Hola ${childName}, en la llamada automática de supervisión con tu familiar *${seniorName}*, nuestro sistema detectó una situación de atención:\n\n` +
    `⚠️ *Motivo de alarma:* ${reason}\n` +
    (transcriptSnippet ? `💬 *Lo que mencionó:* _"${transcriptSnippet.slice(0, 140)}..."_\n\n` : '\n') +
    `📞 *Acción sugerida:* Comunícate de inmediato con tu familiar. Si no contesta o los síntomas son agudos, coordina asistencia médica o contacta al *SAMU (106)*.\n\n` +
    `_(Yuyay es un servicio preventivo de acompañamiento y no reemplaza la atención de emergencias)_`;

  try {
    await sendMetaWhatsAppMessage({
      to: childPhone,
      text: alertMessage,
    });
    console.log(`[Yuyay] 🚨 Alerta de bandera roja enviada con éxito a ${childPhone}`);
    return true;
  } catch (err: any) {
    console.error(`[Yuyay] Error enviando alerta de WhatsApp a ${childPhone}:`, err.message || err);
    return false;
  }
};
