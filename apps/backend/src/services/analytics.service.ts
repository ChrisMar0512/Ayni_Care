import { prisma } from '../prisma/client';
import {
  getGeminiClient,
  callGeminiWithFallback,
  MODEL_CANDIDATES,
} from './ai.service';

export interface TrackEventParams {
  familyId?: string;
  memberId?: string;
  eventType:
    | 'message_received'
    | 'voice_note_received'
    | 'med_dose_logged'
    | 'expense_created'
    | 'appointment_created'
    | 'note_created'
    | 'onboarding_completed'
    | 'pulse_check_answered'
    | 'action_executed';
  channel: 'whatsapp' | 'mobile_app';
  metadata?: any;
}

export interface ClassifyInsightParams {
  familyId?: string;
  memberId?: string;
  senderRole?: string;
  messageText: string;
  channel: 'whatsapp' | 'mobile_app';
}

/**
 * Registra un evento de telemetría de forma rápida y no bloqueante (Fire-and-forget)
 */
export const trackEvent = async (params: TrackEventParams): Promise<void> => {
  try {
    await prisma.analyticsEvent.create({
      data: {
        familyId: params.familyId,
        memberId: params.memberId,
        eventType: params.eventType,
        channel: params.channel,
        metadata: params.metadata || {},
      },
    });
  } catch (err) {
    console.warn('[Analytics] Error registrando AnalyticsEvent:', err);
  }
};

/**
 * Clasifica semánticamente un mensaje en segundo plano con Gemini
 * Extrae: Categoría de dolor, Sentimiento, Nivel de Urgencia, Intención Comercial y Necesidades No Resueltas.
 */
export const classifyInsightAsync = async (params: ClassifyInsightParams): Promise<void> => {
  const text = (params.messageText || '').trim();
  if (text.length < 4) return; // Ignorar saludos o respuestas monosilábicas (ej. "ok", "sí")

  try {
    const gemini = getGeminiClient();

    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour <= 6;

    const analysisPrompt = `
Eres un analista de datos e investigación de producto para Ayni Care (salud y cuidado de adultos mayores).
Analiza el siguiente mensaje enviado por un familiar/cuidador (${params.senderRole || 'familiar'}, canal: ${params.channel}, hora: ${currentHour}:00h):

Mensaje: "${text}"

Extrae estrictamente un objeto JSON con la siguiente estructura:
{
  "category": "medication" | "expense" | "caregiver_friction" | "emergency_night" | "clinical_doubt" | "remote_guilt" | "unmet_need" | "general",
  "sentiment": "calm" | "stressed" | "confused" | "urgent" | "frustrated",
  "urgencyLevel": "low" | "medium" | "high" | "critical",
  "painPointSummary": string o null (resumen conciso del dolor o problema si lo hay, ej. "Falta de cuidadora de relevo", "Hermano no aporta a los gastos", "Duda sobre dosis de pastilla"),
  "isUnmetNeed": boolean (true si el usuario pregunta o pide algo que una app de registro básica no puede resolver, ej. busca enfermera, alquiler de cama clínica, ambulancia, teleconsulta, queja de EsSalud),
  "commercialIntent": "pharma_subscription" | "caregiver_hire" | "telemedicine_sos" | "family_wallet" | "equipment" | null (si el mensaje denota necesidad de compra o contratación),
  "entitiesDetected": {
    "clinics": string[] (clínicas u hospitales mencionados, ej. ["San Felipe", "EsSalud"]),
    "meds": string[] (fármacos mencionados),
    "doctors": string[] (nombres de médicos o especialidades),
    "amount": number o null (monto de dinero mencionado si aplica)
  }
}

Reglas:
- Si el mensaje denota síntomas graves o crisis a altas horas (${isNight ? 'es horario nocturno' : 'horario diurno'}), eleva urgencyLevel a "high" o "critical".
- Si expresa queja de dinero o falta de aporte familiar, category="expense" y commercialIntent="family_wallet".
- Si busca cuidador, enfermera o ayuda para bañar/mover al abuelo, category="caregiver_friction" y commercialIntent="caregiver_hire".
`;

    const aiRes = await callGeminiWithFallback(gemini, MODEL_CANDIDATES, {
      contents: [{ text: analysisPrompt }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(aiRes.text || '{}');

    await prisma.conversationInsight.create({
      data: {
        familyId: params.familyId,
        memberId: params.memberId,
        senderRole: params.senderRole,
        messageSnippet: text.length > 250 ? text.slice(0, 247) + '...' : text,
        category: parsed.category || 'general',
        sentiment: parsed.sentiment || 'calm',
        urgencyLevel: parsed.urgencyLevel || 'low',
        painPointSummary: parsed.painPointSummary || null,
        isUnmetNeed: Boolean(parsed.isUnmetNeed),
        commercialIntent: parsed.commercialIntent || null,
        entitiesDetected: parsed.entitiesDetected || {},
      },
    });

    console.log(`[Analytics] 🧠 Insight clasificado: [${parsed.category}] Urgencia: ${parsed.urgencyLevel}, Sentimiento: ${parsed.sentiment}${parsed.painPointSummary ? ` | Dolor: "${parsed.painPointSummary}"` : ''}`);
  } catch (err: any) {
    console.warn('[Analytics] Error clasificando insight en segundo plano:', err.message || err);
  }
};
