import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { prisma } from '../prisma/client';
import { processAssistantChat } from '../services/ai.service';
import { downloadTwilioMediaAsBase64, sendWhatsAppMessage } from '../services/whatsapp.service';

const { MessagingResponse } = twilio.twiml;

/**
 * Helper para formatear widgets visuales en texto amigable para WhatsApp
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
      return `\n\n🩺 *Cita Médica Agendada / Consultada:*\n📌 *Consulta:* ${data.title}\n👨‍⚕️ *Doctor(a):* ${data.doctorName || 'Por confirmar'}\n📍 *Lugar:* ${data.location || 'Por confirmar'}\n📅 *Fecha:* ${data.scheduledAt ? new Date(data.scheduledAt).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Próximamente'}`;

    case 'note_created':
      return `\n\n📝 *Nota Guardada en Bitácora:*\n📌 *Título:* ${data.title}\n💬 "${data.content}"`;

    default:
      return '';
  }
};

/**
 * Controlador principal del Webhook de WhatsApp de Twilio
 */
export const handleIncomingWhatsApp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const twiml = new MessagingResponse();

  try {
    const fromNumber = (req.body.From || '').trim();
    const messageBody = (req.body.Body || '').trim();
    const numMedia = parseInt(req.body.NumMedia || '0', 10);
    const mediaUrl = req.body.MediaUrl0;
    const mediaContentType = req.body.MediaContentType0;

    console.log(`[WhatsApp] Mensaje entrante de ${fromNumber}. Texto: "${messageBody}", Media: ${numMedia}`);

    // 1. Limpiar número telefónico
    const rawPhone = fromNumber.replace('whatsapp:', '').trim();
    const last9Digits = rawPhone.slice(-9);

    // 2. Buscar al miembro familiar por número de teléfono
    let member = await prisma.familyMember.findFirst({
      where: {
        isActive: true,
        OR: [
          { phone: rawPhone },
          { phone: `+${rawPhone.replace('+', '')}` },
          { phone: { endsWith: last9Digits } },
        ],
      },
      include: {
        family: {
          include: { elderly: true },
        },
      },
    });

    // Fallback de desarrollo: si no encuentra coincidencia exacta, usar el usuario de Christian
    if (!member) {
      member = await prisma.familyMember.findFirst({
        where: { email: 'marchristian48@gmail.com' },
        include: {
          family: {
            include: { elderly: true },
          },
        },
      });
    }

    if (!member) {
      twiml.message('¡Hola! Soy Ayni, tu asistente de cuidado familiar. 🌿\n\nNo encontré tu número registrado en ninguna familia activa de Ayni Care. Por favor, asegúrate de registrar tu número de teléfono en la aplicación móvil.');
      res.type('text/xml').send(twiml.toString());
      return;
    }

    // 3. Procesar audio o texto
    let audioBase64: string | undefined = undefined;

    if (numMedia > 0 && mediaUrl) {
      console.log(`[WhatsApp] Descargando audio multimedia desde Twilio: ${mediaUrl} (${mediaContentType})`);
      try {
        audioBase64 = await downloadTwilioMediaAsBase64(mediaUrl);
      } catch (mediaErr) {
        console.error('[WhatsApp] Error al descargar audio de Twilio:', mediaErr);
      }
    }

    // 4. Llamar al motor unificado de IA de Ayni
    const aiResponse = await processAssistantChat({
      user: {
        userId: member.userId,
        familyId: member.familyId,
        memberId: member.id,
        role: member.role,
      },
      message: messageBody || undefined,
      audioBase64,
      audioMimeType: mediaContentType || 'audio/ogg',
    });

    // 5. Formatear respuesta para WhatsApp
    let replyText = aiResponse.message || 'Acción procesada correctamente.';

    // Agregar resumen de tarjeta interactiva si ejecutó una acción
    if (aiResponse.widget) {
      replyText += formatWidgetForWhatsApp(aiResponse.widget);
    }

    // Si hubo transcripción de voz, avisar amablemente
    if (aiResponse.userTranscription && !messageBody) {
      replyText = `🎙️ _"${aiResponse.userTranscription}"_\n\n` + replyText;
    }

    console.log(`[WhatsApp] Respondiendo a ${fromNumber}...`);
    twiml.message(replyText);
    res.type('text/xml').send(twiml.toString());
    console.log(`[WhatsApp] ✅ Respuesta TwiML enviada exitosamente.`);
  } catch (err) {
    console.error('[WhatsApp] Error procesando webhook:', err);
    twiml.message('Lo siento, tuve un problema temporal al procesar tu solicitud. Por favor intenta de nuevo en unos momentos.');
    res.type('text/xml').send(twiml.toString());
  }
};
