import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { processAssistantChat, transcribeAudio } from '../services/ai.service';
import {
  getMetaCredentials,
  sendMetaWhatsAppMessage,
  markMetaMessageAsRead,
  downloadMetaMediaAsBase64,
} from '../services/meta-whatsapp.service';
import { processOnboardingMessage } from '../services/onboarding.service';
import { formatTextForWhatsApp } from '../utils/whatsapp-formatter';
import { trackEvent, classifyInsightAsync } from '../services/analytics.service';
import { isAwaitingPulseCheck, processPulseAnswer } from '../services/pulse-check.service';

/**
 * Helper para formatear widgets visuales en texto de WhatsApp
 */
const formatWidgetForWhatsApp = (widget: any): string => {
  if (!widget || !widget.data) return '';
  const { type, data } = widget;

  switch (type) {
    case 'medication_dose_logged':
      return `\n\n💊 *Dosis registrada:* ${data.medicationName} (${data.dosage || ''})\n🕒 *Hora:* ${new Date(data.givenAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n📦 *Stock restante:* ${data.stockRemaining !== undefined ? `${data.stockRemaining} unidades` : 'Actualizado'}`;
    case 'medication_created':
      return `\n\n✨ *Nuevo Medicamento en Horario:*\n💊 *Nombre:* ${data.name}\n⚖️ *Dosis:* ${data.dosage || '1 unidad'}\n⏰ *Horarios:* ${Array.isArray(data.times) ? data.times.join(', ') : data.times}\n📝 *Indicaciones:* ${data.instructions || 'Según horario'}`;
    case 'activity_completed':
      return `\n\n✅ *Actividad Completada:* ${data.title}\n👤 *Registrado por:* ${data.completedByName || 'Familiar'}`;
    case 'activity_created':
      return `\n\n📋 *Nueva Tarea Agendada:* ${data.title}\n⏰ *Programada:* ${data.scheduledAt ? new Date(data.scheduledAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'Hoy'}`;
    case 'expense_created': {
      const splitsText = data.splits && data.splits.length > 0
        ? data.splits.map((s: any) => `  • ${s.memberName}: S/. ${Number(s.amount).toFixed(2)}`).join('\n')
        : '';
      return `\n\n💰 *Gasto Registrado:* S/. ${Number(data.amount).toFixed(2)} (${data.title})\n👤 *Pagado por:* ${data.paidByName}\n👥 *División Familiar:*\n${splitsText}`;
    }
    case 'appointment_created':
      return `\n\n🩺 *Cita Médica Agendada:*\n📌 *Consulta:* ${data.title}\n👨‍⚕️ *Doctor(a):* ${data.doctorName || 'Por confirmar'}\n📍 *Lugar:* ${data.location || 'Por confirmar'}\n📅 *Fecha:* ${data.scheduledAt ? new Date(data.scheduledAt).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Próximamente'}`;
    case 'note_created':
      return `\n\n📝 *Nota Guardada en Bitácora:*\n📌 *Título:* ${data.title}\n💬 "${data.content}"`;
    default:
      return '';
  }
};

/**
 * 1. Verificación inicial del Webhook por parte de Meta (GET)
 */
export const verifyMetaWebhook = (req: Request, res: Response): void => {
  const { verifyToken } = getMetaCredentials();

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ [Meta Webhook] Webhook verificado exitosamente por Meta.');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ [Meta Webhook] Verificación fallida. Token incorrecto.');
    res.sendStatus(403);
  }
};

/**
 * 2. Recepción y procesamiento de mensajes entrantes (POST)
 */
export const handleIncomingMetaWebhook = async (req: Request, res: Response): Promise<void> => {
  // Responder inmediatamente 200 OK a Meta para evitar reintentos automáticos
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return; // Notificación de estado (delivered, read), no mensaje nuevo

    const senderPhone = message.from;
    const senderName = value?.contacts?.[0]?.profile?.name || '';
    const messageId = message.id;
    const messageType = message.type;

    console.log(`[Meta WhatsApp] Mensaje entrante de ${senderPhone} (${senderName || 'Anónimo'}). Tipo: ${messageType}`);

    // Marcar como leído
    await markMetaMessageAsRead(messageId);

    // Extraer texto o descargar audio
    let textContent = '';
    let audioBase64: string | undefined = undefined;
    let audioMimeType = 'audio/ogg';

    if (messageType === 'text') {
      textContent = message.text?.body?.trim() || '';
    } else if (messageType === 'audio') {
      const audioId = message.audio?.id;
      if (audioId) {
        console.log(`[Meta WhatsApp] Descargando audio ID: ${audioId}...`);
        const downloaded = await downloadMetaMediaAsBase64(audioId);
        audioBase64 = downloaded.base64;
        audioMimeType = downloaded.mimeType;

        // Transcribir el audio para onboarding o logging
        textContent = await transcribeAudio(audioBase64, audioMimeType);
        console.log(`[Meta WhatsApp] Audio transcrito: "${textContent}"`);
      }
    } else {
      // Tipo no soportado por ahora (ej. stickers, ubicación)
      await sendMetaWhatsAppMessage({
        to: senderPhone,
        text: '🌿 Recibí tu mensaje, pero actualmente solo puedo procesar texto y notas de voz.',
      });
      return;
    }

    const cleanPhone = senderPhone.replace(/\D/g, '');
    const last9 = cleanPhone.slice(-9);

    // 1. Buscar si el usuario ya pertenece a una familia registrada
    const member = await prisma.familyMember.findFirst({
      where: {
        isActive: true,
        OR: [
          { phone: cleanPhone },
          { phone: `+${cleanPhone}` },
          { phone: { endsWith: last9 } },
        ],
      },
      include: {
        family: {
          include: { elderly: true },
        },
      },
    });

    // Telemetría no bloqueante
    trackEvent({
      familyId: member?.familyId,
      memberId: member?.id,
      eventType: messageType === 'audio' ? 'voice_note_received' : 'message_received',
      channel: 'whatsapp',
      metadata: { phone: cleanPhone },
    });

    // 2. Si NO existe usuario, iniciar o continuar Onboarding Conversacional
    if (!member) {
      console.log(`[Meta WhatsApp] Usuario no registrado (${cleanPhone}). Derivando a Onboarding Conversacional...`);
      const onboardingReply = await processOnboardingMessage({
        phone: cleanPhone,
        text: textContent,
        senderName,
      });

      await sendMetaWhatsAppMessage({
        to: senderPhone,
        text: onboardingReply,
      });
      return;
    }

    // 3. Verificar si está respondiendo al Micro-Sondeo Semanal (Pulse Check)
    if (isAwaitingPulseCheck(cleanPhone, textContent)) {
      const pulseReply = await processPulseAnswer({
        familyId: member.familyId,
        memberId: member.id,
        phone: cleanPhone,
        rawAnswer: textContent,
      });

      await sendMetaWhatsAppMessage({
        to: senderPhone,
        text: pulseReply,
      });
      return;
    }

    // 4. Clasificación semántica e investigación de dolor en segundo plano
    classifyInsightAsync({
      familyId: member.familyId,
      memberId: member.id,
      senderRole: member.role,
      messageText: textContent,
      channel: 'whatsapp',
    });

    // 5. Si YA existe usuario, procesar con el Asistente Core de Ayni
    const aiResponse = await processAssistantChat({
      user: {
        userId: member.userId,
        familyId: member.familyId,
        memberId: member.id,
        role: member.role,
      },
      message: textContent || undefined,
      audioBase64,
      audioMimeType,
    });

    if (aiResponse.widget) {
      trackEvent({
        familyId: member.familyId,
        memberId: member.id,
        eventType: 'action_executed',
        channel: 'whatsapp',
        metadata: { actionType: aiResponse.widget.type },
      });
    }

    const cleanMessage = formatTextForWhatsApp(aiResponse.message || 'Acción procesada correctamente.');
    let replyText = `🌿 *Ayni:*\n${cleanMessage}`;

    if (aiResponse.widget) {
      replyText += formatWidgetForWhatsApp(aiResponse.widget);
    }

    if (aiResponse.userTranscription && messageType === 'audio') {
      replyText = `🎙️ _"${aiResponse.userTranscription}"_\n\n` + replyText;
    }

    console.log(`[Meta WhatsApp] Enviando respuesta a ${senderPhone}...`);
    await sendMetaWhatsAppMessage({
      to: senderPhone,
      text: replyText,
    });
    console.log(`[Meta WhatsApp] ✅ Mensaje entregado con éxito.`);
  } catch (err: any) {
    console.error('[Meta WhatsApp] Error procesando webhook:', err.message || err);
  }
};
