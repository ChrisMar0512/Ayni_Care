import axios from 'axios';
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
  isInduction?: boolean;
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
  consentGranted?: boolean; // Para llamadas de inducción
  consentNotes?: string | null;
}

export interface OutboundCallOptions {
  elderlyId: string;
  scheduledCallId?: string;
  timeSlot?: 'mañana' | 'tarde' | 'noche';
  isInduction?: boolean;
  forceSimulate?: boolean;
}

export interface OutboundCallResult {
  success: boolean;
  callId: string;
  provider: 'plivo' | 'twilio' | 'vapi' | 'simulation';
  isInduction: boolean;
  targetPhone: string;
  status: string;
  message: string;
}

/**
 * 1. Genera un micro-contexto (menos de 150 tokens) para la llamada de voz saliente.
 * Evita sobrecostos y reduce latencia en el agente de voz.
 */
export const buildMicroContextForCall = async (
  elderlyId: string,
  timeSlot: 'mañana' | 'tarde' | 'noche' = 'mañana',
  isInduction: boolean = false
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
    isInduction,
  };
};

/**
 * 2. Analiza la transcripción de la llamada con Gemini Flash usando micro-tokens.
 * Detecta tomas de medicamentos, estado anímico, señales de alarma médica (Red Flags)
 * y consentimiento informado si es llamada de inducción (Ley 29733).
 */
export const analyzeCallTranscript = async (
  transcript: string,
  expectedMeds: string[] = [],
  isInduction: boolean = false
): Promise<ExtractedCallResult> => {

  const prompt = `
Eres el motor clínico de teleasistencia de Yuyay (Perú).
Analiza la siguiente transcripción de una llamada de voz con un adulto mayor.

Tipo de llamada: ${isInduction ? 'INDUCCIÓN Y CONSENTIMIENTO INFORMADO' : 'SUPERVISIÓN DE MEDICACIÓN Y BIENESTAR'}
Medicamentos esperados: ${expectedMeds.join(', ') || 'Medicamentos habituales del paciente'}

Transcripción:
"""${transcript}"""

Extrae ÚNICAMENTE un objeto JSON válido con este formato exacto:
{
  "medsConfirmed": [
    { "name": "nombre del fármaco", "taken": true/false, "reason": "motivo si no la tomó o null" }
  ],
  "mood": "resumen en 3 a 5 palabras del estado anímico (ej. 'Tranquilo y buen ánimo', 'Cansado', 'Preocupado')",
  "symptoms": "síntomas físicos o molestias mencionadas o 'Sin síntomas reportados'",
  "hasRedFlag": true si el paciente mencionó dolor de pecho/opresión, mareo intenso, caída reciente, visión borrosa, falta de aire o desorientación severa; de lo contrario false,
  "redFlagReason": "descripción breve del síntoma de alarma si hasRedFlag es true, de lo contrario null",
  "consentGranted": ${isInduction ? 'true si el adulto mayor aceptó verbalmente recibir las llamadas diarias de Yuyay, false si rechazó el servicio' : 'null'},
  "consentNotes": ${isInduction ? '"resumen breve de la respuesta del adulto mayor sobre el consentimiento"' : 'null'}
}
`;

  try {
    // Dentro del try: si falta la clave o Gemini falla, se usa el respaldo por palabras clave.
    const gemini = getGeminiClient();
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
      consentGranted: parsed.consentGranted ?? undefined,
      consentNotes: parsed.consentNotes ?? null,
    };
  } catch (err: any) {
    console.error('[Yuyay Call Service] Error extrayendo datos con Gemini:', err.message || err);
    const hasEmergencyKeywords = /pecho|mareo|ca[ií]|desmay|aire|borros/i.test(transcript);
    return {
      medsConfirmed: [],
      mood: 'No determinado',
      symptoms: 'Revisión requerida',
      hasRedFlag: hasEmergencyKeywords,
      redFlagReason: hasEmergencyKeywords ? 'Palabras clave de riesgo detectadas en el audio' : null,
      // Nunca asumir consentimiento si la IA falló: queda sin registrar para revisión manual (Ley 29733).
      consentGranted: undefined,
      consentNotes: isInduction ? 'No se pudo analizar la llamada de inducción; requiere revisión manual.' : null,
    };
  }
};

/**
 * 3. Procesa el consentimiento verbal informado (Ley N.° 29733 de Perú) tras una llamada de inducción.
 */
export const processInductionConsent = async (params: {
  elderlyId: string;
  consentGranted: boolean;
  recordingUrl?: string;
  consentNotes?: string | null;
}): Promise<void> => {
  const { elderlyId, consentGranted, recordingUrl, consentNotes } = params;

  const elderly = await prisma.elderlyPerson.findUnique({
    where: { id: elderlyId },
    include: {
      family: {
        include: {
          members: {
            where: { role: 'primary_caregiver', isActive: true },
          },
        },
      },
    },
  });

  if (!elderly) return;

  // Actualizar el estado de consentimiento
  await prisma.elderlyPerson.update({
    where: { id: elderlyId },
    data: {
      consentVerbal: consentGranted,
      consentDate: new Date(),
      consentAudioUrl: recordingUrl || null,
      notes: consentNotes
        ? `${elderly.notes ? elderly.notes + ' | ' : ''}Inducción: ${consentNotes}`
        : elderly.notes,
    },
  });

  const caregiver = elderly.family.members[0];
  if (caregiver && caregiver.phone) {
    const cleanPhone = normalizePeruPhone(caregiver.phone);
    let messageText = '';

    if (consentGranted) {
      messageText =
        `🌿 *¡Consentimiento Confirmado — Yuyay!*\n\n` +
        `Hola ${caregiver.name}, completamos la llamada de inducción con tu familiar *${elderly.name}*.\n\n` +
        `✅ Aceptó verbalmente el acompañamiento telefónico preventivo de acuerdo con la Ley N.° 29733.\n` +
        `📞 A partir de ahora, recibirá sus llamadas automáticas de supervisión en sus horarios habituales (${elderly.preferredCallTimes.join(' y ')}).\n\n` +
        `_Recibirás tus reportes nocturnos diarios en este mismo chat._`;
    } else {
      messageText =
        `⚠️ *Atención — Inducción Yuyay*\n\n` +
        `Hola ${caregiver.name}, nos comunicamos con *${elderly.name}* para la llamada de inducción, pero no logramos obtener su consentimiento verbal (${consentNotes || 'Prefirió no recibir llamadas'}).\n\n` +
        `Las llamadas regulares han quedado en pausa hasta que coordines con tu familiar. Contáctanos si deseas reprogramar.`;
    }

    try {
      await sendMetaWhatsAppMessage({
        to: cleanPhone,
        text: messageText,
      });
      console.log(`[Yuyay] Notificación de inducción enviada a ${cleanPhone}`);
    } catch (err: any) {
      console.error(`[Yuyay] Error enviando WhatsApp de inducción:`, err.message || err);
    }
  }
};

/**
 * 4. Dispara una notificación de alerta inmediata (Bandera Roja) por WhatsApp al hijo cuidador.
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
    `Hola ${childName}, en la supervisión de teleasistencia con tu familiar *${seniorName}*, nuestro sistema detectó una situación de atención:\n\n` +
    `⚠️ *Motivo de alarma:* ${reason}\n` +
    (transcriptSnippet ? `💬 *Lo que mencionó:* _"${transcriptSnippet.slice(0, 140)}..."_\n\n` : '\n') +
    `📞 *Acción sugerida:* Comunícate de inmediato con tu familiar. Si no contesta o los síntomas son agudos, coordina asistencia médica o contacta al *SAMU (106)*.\n\n` +
    `_(Yuyay es un servicio preventivo de acompañamiento y no reemplaza la atención de emergencias)_`;

  try {
    await sendMetaWhatsAppMessage({
      to: normalizePeruPhone(childPhone),
      text: alertMessage,
    });
    console.log(`[Yuyay] 🚨 Alerta de bandera roja enviada con éxito a ${childPhone}`);
    return true;
  } catch (err: any) {
    console.error(`[Yuyay] Error enviando alerta de WhatsApp a ${childPhone}:`, err.message || err);
    return false;
  }
};

/**
 * 5. Gestiona intentos fallidos de llamada y protocolo de 3 reintentos.
 * Si alcanza 3 reintentos consecutivos sin respuesta, dispara alerta de bandera roja inmediata al cuidador.
 */
export const handleMissedCallAttempt = async (scheduledCallId: string): Promise<void> => {
  const scheduledCall = await prisma.scheduledCall.findUnique({
    where: { id: scheduledCallId },
    include: {
      elderly: {
        include: {
          family: {
            include: {
              members: {
                where: { role: 'primary_caregiver', isActive: true },
              },
            },
          },
        },
      },
    },
  });

  if (!scheduledCall) return;

  const currentRetries = scheduledCall.retryCount + 1;
  const senior = scheduledCall.elderly;
  const caregiver = senior.family.members[0];
  const isFinalAttempt = currentRetries >= 3;

  // Solo se procesa una llamada que está en curso. Evita contar dos veces el mismo intento
  // (webhook duplicado, o webhook tardío después de que el scheduler ya la dio por no contestada).
  const claim = await prisma.scheduledCall.updateMany({
    where: { id: scheduledCallId, status: 'calling', retryCount: scheduledCall.retryCount },
    data: {
      status: isFinalAttempt ? 'failed' : 'no_answer',
      retryCount: currentRetries,
      lastCallAt: new Date(),
    },
  });
  if (claim.count !== 1) {
    console.log(`[Yuyay] Intento no contestado ignorado para ${scheduledCallId}: la llamada ya no estaba en curso.`);
    return;
  }

  if (isFinalAttempt) {
    // 3 intentos sin contestar: Bandera Roja por inubicabilidad
    let alertSent = false;
    if (caregiver && caregiver.phone) {
      alertSent = await triggerImmediateRedFlagAlert({
        childPhone: caregiver.phone,
        childName: caregiver.name,
        seniorName: senior.name,
        reason: 'Tu familiar no contestó el teléfono tras 3 llamadas consecutivas de supervisión.',
      });
    } else {
      console.error(`[Yuyay] 🚨 ${senior.name} no contestó 3 veces y su familia no tiene cuidador con teléfono.`);
    }

    await prisma.callLog.create({
      data: {
        scheduledCallId,
        elderlyId: senior.id,
        durationSeconds: 0,
        status: 'no_answer',
        hasRedFlag: true,
        redFlagReason: 'El adulto mayor no respondió la llamada tras 3 intentos consecutivos.',
        alertSentAt: alertSent ? new Date() : null,
      },
    });

    console.log(`[Yuyay] 🚨 Alerta de 3 intentos fallidos disparada para ${senior.name}`);
  } else {
    // Reintento programado (el scheduler vuelve a marcar en 15 minutos)
    await prisma.callLog.create({
      data: {
        scheduledCallId,
        elderlyId: senior.id,
        durationSeconds: 0,
        status: 'no_answer',
      },
    });

    console.log(`[Yuyay] 🔁 Intento ${currentRetries}/3 sin respuesta para ${senior.name}. Reintento reprogramado.`);
  }
};


type VoiceProvider = 'vapi' | 'simulation';

/**
 * Elige el proveedor de voz.
 *
 * YUYAY_VOICE_PROVIDER=vapi | simulation. Si no está definido: Vapi si hay credenciales,
 * simulación solo fuera de producción. En producción nunca se simula en silencio:
 * si no hay proveedor configurado se lanza un error.
 *
 * Plivo y Twilio quedaron fuera porque su integración estaba incompleta (Plivo apuntaba a
 * /api/yuyay/plivo-answer, que no existe, y Twilio esperaba TwiML que nadie genera).
 * El código original sigue en la rama pivot/yuyay.
 */
const resolveVoiceProvider = (forceSimulate: boolean): VoiceProvider => {
  const isProduction = process.env.NODE_ENV === 'production';
  const configured = process.env.YUYAY_VOICE_PROVIDER?.toLowerCase();
  const hasVapi = Boolean(
    process.env.VAPI_API_KEY && process.env.VAPI_PHONE_NUMBER_ID && process.env.VAPI_ASSISTANT_ID
  );

  if (forceSimulate || configured === 'simulation') {
    if (isProduction) throw new Error('La simulación de llamadas no está permitida en producción.');
    return 'simulation';
  }

  if (configured === 'plivo' || configured === 'twilio') {
    throw new Error(`El proveedor "${configured}" todavía no está implementado. Usa YUYAY_VOICE_PROVIDER=vapi.`);
  }

  if (configured === 'vapi' || hasVapi) {
    if (!hasVapi) throw new Error('Faltan VAPI_API_KEY, VAPI_PHONE_NUMBER_ID o VAPI_ASSISTANT_ID.');
    return 'vapi';
  }

  if (isProduction) {
    throw new Error('No hay proveedor de voz configurado (YUYAY_VOICE_PROVIDER / credenciales de Vapi).');
  }
  return 'simulation';
};

/**
 * Normaliza un número peruano a E.164 sin "+": "939 959 366" → "51939959366".
 */
export const normalizePeruPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  return digits;
};

/**
 * 6. Dispara una llamada telefónica saliente (Dispatch Outbound Call).
 * Si el proveedor falla, lanza error (no cae a simulación) para que el scheduler lo registre.
 */
export const dispatchOutboundCall = async (
  options: OutboundCallOptions
): Promise<OutboundCallResult> => {
  const {
    elderlyId,
    scheduledCallId,
    timeSlot = 'mañana',
    isInduction = false,
    forceSimulate = false,
  } = options;

  const elderly = await prisma.elderlyPerson.findUnique({
    where: { id: elderlyId },
  });

  if (!elderly || !elderly.phone) {
    throw new Error(`Adulto mayor (${elderlyId}) no encontrado o sin número de teléfono configurado.`);
  }

  const provider = resolveVoiceProvider(forceSimulate);
  const targetPhone = normalizePeruPhone(elderly.phone);

  // Actualizar ScheduledCall a "calling" si se proveyó el id
  if (scheduledCallId) {
    await prisma.scheduledCall.update({
      where: { id: scheduledCallId },
      data: { status: 'calling', lastCallAt: new Date() },
    });
  }

  if (provider === 'vapi') {
    const context = await buildMicroContextForCall(elderlyId, timeSlot, isInduction);
    const medicationsText =
      context?.medications.map((m) => `${m.name} ${m.dosage}${m.instructions ? ` (${m.instructions})` : ''}`).join('; ') ||
      'sin medicamentos registrados';

    try {
      const response = await axios.post(
        'https://api.vapi.ai/call',
        {
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          assistantId: process.env.VAPI_ASSISTANT_ID,
          customer: {
            number: `+${targetPhone}`,
            name: elderly.name,
          },
          assistantOverrides: {
            // El webhook usa elderlyId y scheduledCallId para saber a quién pertenece la llamada.
            // El prompt del asistente en Vapi puede usar {{medications}}, {{conditions}} y {{lastMood}}.
            variableValues: {
              elderlyId: elderly.id,
              scheduledCallId: scheduledCallId ?? '',
              seniorName: elderly.name,
              timeSlot,
              isInduction,
              medications: medicationsText,
              conditions: context?.conditions.join(', ') || 'no registradas',
              lastMood: context?.lastMood || 'sin registro previo',
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        callId: response.data?.id || `vapi_${Date.now()}`,
        provider: 'vapi',
        isInduction,
        targetPhone,
        status: 'calling',
        message: 'Llamada iniciada exitosamente a través de Vapi AI.',
      };
    } catch (err) {
      const detail = axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? err.message) : String(err);
      throw new Error(`Vapi rechazó la llamada: ${detail}`);
    }
  }

  // Modo simulación (solo desarrollo): permite probar el backend sin saldo.
  const simCallId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(
    `[Yuyay Simulator] 📞 Llamada simulada a Don/Doña ${elderly.name} (${targetPhone}) | Tipo: ${
      isInduction ? 'Inducción' : 'Supervisión ' + timeSlot
    } | ID: ${simCallId}`
  );

  return {
    success: true,
    callId: simCallId,
    provider: 'simulation',
    isInduction,
    targetPhone,
    status: 'calling',
    message: 'Llamada simulada exitosamente. Listo para enviar webhook de transcripción.',
  };
};

/**
 * Traduce el "endedReason" del end-of-call-report de Vapi a nuestro estado de llamada.
 * Devuelve null si la llamada fue atendida.
 */
export const mapVapiEndedReason = (
  endedReason: string | null | undefined
): 'no_answer' | 'busy' | 'machine' | 'failed' | null => {
  if (!endedReason) return null;
  const reason = endedReason.toLowerCase();
  if (reason.includes('did-not-answer') || reason.includes('no-answer')) return 'no_answer';
  if (reason.includes('busy')) return 'busy';
  if (reason.includes('voicemail')) return 'machine';
  if (reason.includes('failed-to-connect') || reason.startsWith('call.start.error')) return 'failed';
  return null;
};
