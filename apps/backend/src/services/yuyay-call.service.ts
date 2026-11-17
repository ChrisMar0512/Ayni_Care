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
  const gemini = getGeminiClient();

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
    const response = await callGeminiWithFallback(gemini, MODEL_CANDIDATES, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const rawText = (response?.text || '{}').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
    const parsed: ExtractedCallResult = JSON.parse(cleanJson);

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
      consentGranted: isInduction ? true : undefined,
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
    const cleanPhone = caregiver.phone.replace(/\D/g, '');
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

  if (currentRetries >= 3) {
    // 3 intentos sin contestar: Bandera Roja por inubicabilidad
    await prisma.scheduledCall.update({
      where: { id: scheduledCallId },
      data: {
        status: 'failed',
        retryCount: currentRetries,
        lastCallAt: new Date(),
      },
    });

    const log = await prisma.callLog.create({
      data: {
        scheduledCallId,
        elderlyId: senior.id,
        durationSeconds: 0,
        status: 'no_answer',
        hasRedFlag: true,
        redFlagReason: 'El adulto mayor no respondió la llamada tras 3 intentos consecutivos.',
        alertSentAt: new Date(),
      },
    });

    if (caregiver && caregiver.phone) {
      await triggerImmediateRedFlagAlert({
        childPhone: caregiver.phone,
        childName: caregiver.name,
        seniorName: senior.name,
        reason: 'Tu familiar no contestó el teléfono tras 3 llamadas consecutivas de supervisión.',
      });
    }

    console.log(`[Yuyay] 🚨 Alerta de 3 intentos fallidos disparada para ${senior.name}`);
  } else {
    // Reintento programado
    await prisma.scheduledCall.update({
      where: { id: scheduledCallId },
      data: {
        status: 'no_answer',
        retryCount: currentRetries,
        lastCallAt: new Date(),
      },
    });

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

/**
 * 6. Dispara una llamada telefónica saliente (Dispatch Outbound Call).
 * Soporta Plivo SIP (Stack Yuyay Oficial), Vapi, Twilio Voice y Modo Simulación.
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

  const targetPhone = elderly.phone.replace(/\D/g, '');
  const plivoAuthId = process.env.PLIVO_AUTH_ID;
  const plivoAuthToken = process.env.PLIVO_AUTH_TOKEN;
  const plivoFromNumber = process.env.PLIVO_PHONE_NUMBER;

  const vapiApiKey = process.env.VAPI_API_KEY;
  const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

  // Actualizar ScheduledCall a "calling" si se proveyó el id
  if (scheduledCallId) {
    await prisma.scheduledCall.update({
      where: { id: scheduledCallId },
      data: { status: 'calling', lastCallAt: new Date() },
    });
  }

  // 1. Stack Oficial Plivo SIP
  if (!forceSimulate && plivoAuthId && plivoAuthToken && plivoFromNumber) {
    try {
      const plivoEndpoint = `https://api.plivo.com/v1/Account/${plivoAuthId}/Call/`;
      const authHeader = Buffer.from(`${plivoAuthId}:${plivoAuthToken}`).toString('base64');
      const webhookBase = process.env.BACKEND_PUBLIC_URL || 'https://api.aynicare.com';

      const response = await axios.post(
        plivoEndpoint,
        {
          from: plivoFromNumber,
          to: targetPhone,
          answer_url: `${webhookBase}/api/yuyay/plivo-answer?elderlyId=${elderly.id}&timeSlot=${timeSlot}&isInduction=${isInduction}`,
          hangup_url: `${webhookBase}/api/yuyay/voice-webhook`,
          machine_detection: 'hangup', // Answering Machine Detection (AMD) para evitar costo de buzón
          time_limit: 300, // Hard cap de 5.0 minutos (300 segundos)
        },
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const callUuid = response.data?.request_uuid || `plivo_${Date.now()}`;
      return {
        success: true,
        callId: callUuid,
        provider: 'plivo',
        isInduction,
        targetPhone,
        status: 'calling',
        message: 'Llamada iniciada exitosamente a través de Plivo SIP.',
      };
    } catch (err: any) {
      console.error('[Yuyay Plivo Call] Error iniciando llamada:', err.response?.data || err.message);
    }
  }

  // 2. Vapi Voice AI (Alternativa Fast-Track)
  if (!forceSimulate && vapiApiKey && vapiPhoneNumberId && vapiAssistantId) {
    try {
      const response = await axios.post(
        'https://api.vapi.ai/call',
        {
          phoneNumberId: vapiPhoneNumberId,
          assistantId: vapiAssistantId,
          customer: {
            number: `+${targetPhone}`,
            name: elderly.name,
          },
          assistantOverrides: {
            variableValues: {
              seniorName: elderly.name,
              timeSlot,
              isInduction,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json',
          },
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
    } catch (err: any) {
      console.error('[Yuyay Vapi Call] Error iniciando llamada:', err.response?.data || err.message);
    }
  }

  // 3. Twilio Voice (Alternativa preinstalada)
  if (!forceSimulate && twilioSid && twilioAuthToken && twilioFromNumber) {
    try {
      const twilio = require('twilio')(twilioSid, twilioAuthToken);
      const webhookBase = process.env.BACKEND_PUBLIC_URL || 'https://api.aynicare.com';

      const call = await twilio.calls.create({
        url: `${webhookBase}/api/yuyay/runtime-context/${elderly.id}?twiml=true`,
        to: `+${targetPhone}`,
        from: twilioFromNumber,
        timeLimit: 300,
        statusCallback: `${webhookBase}/api/yuyay/voice-webhook`,
      });

      return {
        success: true,
        callId: call.sid,
        provider: 'twilio',
        isInduction,
        targetPhone,
        status: 'calling',
        message: 'Llamada iniciada exitosamente a través de Twilio Voice.',
      };
    } catch (err: any) {
      console.error('[Yuyay Twilio Call] Error iniciando llamada:', err.message);
    }
  }

  // 4. Modo Simulación Seguro (Permite probar todo el backend y WhatsApp de inmediato sin saldo)
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
