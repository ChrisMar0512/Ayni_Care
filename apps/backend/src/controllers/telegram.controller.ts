import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { processAssistantChat, transcribeAudio } from '../services/ai.service';
import {
  sendTelegramMessage,
  sendTelegramChatAction,
  downloadTelegramAudioAsBase64,
  setTelegramWebhook,
} from '../services/telegram.service';
import { processOnboardingMessage } from '../services/onboarding.service';
import { trackEvent, classifyInsightAsync } from '../services/analytics.service';
import { isAwaitingPulseCheck, processPulseAnswer } from '../services/pulse-check.service';

/**
 * Helper para formatear los widgets visuales de acciones exitosas en texto enriquecido para Telegram
 */
const formatWidgetForTelegram = (widget: any): string => {
  if (!widget || !widget.data) return '';
  const { type, data } = widget;

  switch (type) {
    case 'medication_dose_logged':
      return `\n\n💊 *Dosis registrada:* ${data.medicationName} (${data.dosage || ''})\n🕒 *Hora:* ${new Date(data.givenAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n📦 *Stock restante:* ${data.stockRemaining !== undefined ? `${data.stockRemaining} unidades` : 'Actualizado'}`;

    case 'medication_created':
      return `\n\n✨ *Nuevo Medicamento Agregado:*\n💊 *Nombre:* ${data.name}\n⚖️ *Dosis:* ${data.dosage || '1 unidad'}\n⏰ *Horarios:* ${Array.isArray(data.times) ? data.times.join(', ') : data.times}\n📝 *Indicaciones:* ${data.instructions || 'Según horario'}`;

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
 * 1. Webhook receptor de actualizaciones de Telegram (POST)
 */
export const handleTelegramWebhook = async (req: Request, res: Response): Promise<void> => {
  // Telegram espera un 200 OK inmediato
  res.sendStatus(200);

  try {
    const update = req.body;
    if (!update) return;

    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat?.id;
    const fromUser = message.from;
    const senderName = `${fromUser?.first_name || ''} ${fromUser?.last_name || ''}`.trim() || fromUser?.username || 'Familiar';
    const messageId = message.message_id;

    if (!chatId) return;

    console.log(`[Telegram] Mensaje de ${senderName} (ChatID: ${chatId})`);

    // Mostrar indicador de "escribiendo..." de inmediato
    sendTelegramChatAction(chatId, 'typing');

    let textContent = message.text?.trim() || '';
    let audioBase64: string | undefined = undefined;
    let audioMimeType = 'audio/ogg';
    let isVoice = false;

    // A. Manejo de Nota de Voz o Audio
    if (message.voice || message.audio) {
      isVoice = true;
      const fileId = message.voice ? message.voice.file_id : message.audio.file_id;
      console.log(`[Telegram] Descargando nota de voz (file_id: ${fileId})...`);

      try {
        const downloaded = await downloadTelegramAudioAsBase64(fileId);
        audioBase64 = downloaded.base64;
        audioMimeType = downloaded.mimeType;

        // Transcribir audio con Gemini
        textContent = await transcribeAudio(audioBase64, audioMimeType);
        console.log(`[Telegram] 🎙️ Audio transcrito: "${textContent}"`);
      } catch (audioErr: any) {
        console.error('[Telegram] Error procesando audio:', audioErr.message || audioErr);
        await sendTelegramMessage({
          chatId,
          text: '🌿 Disculpa, no pude procesar tu nota de voz. Por favor intenta enviarla de nuevo o escribe tu mensaje.',
        });
        return;
      }
    }

    // B. Manejo de Comando /start
    if (textContent === '/start') {
      const welcomeText =
        `🌿 *¡Hola ${senderName}! Te doy la bienvenida a Ayni Care.*\n\n` +
        `Soy tu asistente de cuidado familiar para adultos mayores. Conmigo puedes coordinar todo con tu familia de manera rápida y sin complicaciones.\n\n` +
        `*Puedes pedirme o decirme cosas como:*\n` +
        `💊 _"Papá ya tomó su Losartán de 50mg"_\n` +
        `💰 _"Gasté S/. 45 en la farmacia comprando pañales"_\n` +
        `🩺 _"Agenda cita con el geriatra este viernes a las 4pm"_\n` +
        `📋 _"¿Qué medicinas le tocan hoy a mi abuelo?"_\n` +
        `🎙️ *O simplemente envíame una nota de voz hablando naturalmente.*`;

      await sendTelegramMessage({
        chatId,
        text: welcomeText,
        replyMarkup: {
          keyboard: [
            [{ text: '💊 Medicinas de hoy' }, { text: '💰 Registrar un gasto' }],
            [{ text: '📋 Actividades pendientes' }, { text: '🩺 Próximas citas' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });
      return;
    }

    // C. Buscar si el usuario ya está asociado a una familia
    // Buscamos si existe un miembro con ese teléfono o si ya vinculó su ID
    const senderUsername = fromUser?.username || '';
    const member = await prisma.familyMember.findFirst({
      where: {
        isActive: true,
      },
      include: {
        family: {
          include: { elderly: true },
        },
      },
    });

    // Registrar evento de analítica
    trackEvent({
      familyId: member?.familyId,
      memberId: member?.id,
      eventType: isVoice ? 'voice_note_received' : 'message_received',
      channel: 'mobile_app', // Telemetría
      metadata: { chatId, senderName, username: senderUsername },
    });

    // Clasificación semántica de dolor en segundo plano con Gemini
    if (textContent) {
      classifyInsightAsync({
        familyId: member?.familyId,
        memberId: member?.id,
        senderRole: member?.role || 'familiar',
        messageText: textContent,
        channel: 'mobile_app',
      });
    }

    // D. Si hay un miembro de prueba o familia activa, procesar con el Asistente IA Core
    if (member) {
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
          channel: 'mobile_app',
          metadata: { actionType: aiResponse.widget.type },
        });
      }

      let replyText = `🌿 *Ayni:*\n${aiResponse.message || 'Acción procesada correctamente.'}`;

      if (aiResponse.widget) {
        replyText += formatWidgetForTelegram(aiResponse.widget);
      }

      if (aiResponse.userTranscription && isVoice) {
        replyText = `🎙️ _"${aiResponse.userTranscription}"_\n\n` + replyText;
      }

      await sendTelegramMessage({
        chatId,
        text: replyText,
      });
    } else {
      // Si aún no hay familias en la BD, dar respuesta guiada
      await sendTelegramMessage({
        chatId,
        text: `🌿 Recibí tu mensaje: "${textContent}". Aún no tienes una familia configurada en Ayni Care. Puedes crear tu familia desde la app o escribirnos para ayudarte.`,
      });
    }
  } catch (error: any) {
    console.error('[Telegram] Error en webhook:', error.message || error);
  }
};

/**
 * 2. Endpoint para configurar el Webhook de Telegram en un solo clic (GET /api/telegram/setup-webhook)
 */
export const setupTelegramWebhookEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const defaultUrl = `${protocol}://${host}/api/telegram/webhook`;

    const targetUrl = (req.query.url as string) || defaultUrl;

    console.log(`[Telegram] Configurando webhook hacia: ${targetUrl}`);
    const result = await setTelegramWebhook(targetUrl);

    res.json({
      success: true,
      data: {
        configuredUrl: targetUrl,
        telegramResponse: result,
      },
      error: undefined,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Error al configurar webhook de Telegram',
    });
  }
};
