import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  WASocket,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import { prisma } from '../prisma/client';
import { processAssistantChat } from './ai.service';

let botSocket: WASocket | null = null;

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
      const splitsText =
        data.splits && data.splits.length > 0
          ? data.splits.map((s: any) => `  • ${s.memberName}: S/. ${Number(s.amount).toFixed(2)}`).join('\n')
          : '';
      return `\n\n💰 *Gasto Registrado:* S/. ${Number(data.amount).toFixed(2)} (${data.title})\n👤 *Pagado por:* ${data.paidByName}\n👥 *División Familiar:*\n${splitsText}`;
    }

    case 'appointment_created':
      return `\n\n🩺 *Cita Médica:*\n📌 *Consulta:* ${data.title}\n👨‍⚕️ *Doctor(a):* ${data.doctorName || 'Por confirmar'}\n📍 *Lugar:* ${data.location || 'Por confirmar'}\n📅 *Fecha:* ${data.scheduledAt ? new Date(data.scheduledAt).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Próximamente'}`;

    case 'note_created':
      return `\n\n📝 *Nota Guardada en Bitácora:*\n📌 *Título:* ${data.title}\n💬 "${data.content}"`;

    default:
      return '';
  }
};

export async function startWhatsAppBot() {
  const authDir = path.join(process.cwd(), 'whatsapp_auth');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  botSocket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📱 ESCANEA ESTE CÓDIGO QR EN WHATSAPP CON TU CELULAR:');
      console.log('   (WhatsApp > Ajustes / Menú > Dispositivos vinculados > Vincular)');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[WhatsApp Bot] Conexión cerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppBot();
      }
    } else if (connection === 'open') {
      console.log('\n======================================================');
      console.log('🎉 ¡AYNI CARE WHATSAPP BOT CONECTADO EXITOSAMENTE! 🌿');
      console.log('   Listo para recibir audios y mensajes por WhatsApp.');
      console.log('======================================================\n');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      // Ignorar mensajes enviados por el propio bot
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us')) continue; // Ignorar grupos por ahora

      const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
      const last9Digits = rawPhone.slice(-9);

      // Identificar si es audio o texto
      const isAudio = Boolean(msg.message?.audioMessage);
      const textMessage =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      console.log(`[WhatsApp Bot] Mensaje de ${rawPhone}. Tipo: ${isAudio ? 'Nota de Voz' : 'Texto'}`);

      // Buscar al miembro familiar en la BD
      let member = await prisma.familyMember.findFirst({
        where: {
          isActive: true,
          OR: [
            { phone: rawPhone },
            { phone: `+${rawPhone}` },
            { phone: { endsWith: last9Digits } },
          ],
        },
      });

      // Fallback para desarrollo: usuario de Christian
      if (!member) {
        member = await prisma.familyMember.findFirst({
          where: { email: 'marchristian48@gmail.com' },
        });
      }

      if (!member) {
        await sock.sendMessage(remoteJid, {
          text: '¡Hola! Soy Ayni, tu asistente de cuidado familiar. 🌿\n\nNo encontré tu número registrado en ninguna familia de Ayni Care.',
        });
        continue;
      }

      let audioBase64: string | undefined = undefined;
      let audioMimeType = 'audio/ogg';

      if (isAudio) {
        try {
          console.log('[WhatsApp Bot] Descargando nota de voz...');
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
          );
          audioBase64 = buffer.toString('base64');
          audioMimeType = msg.message?.audioMessage?.mimetype || 'audio/ogg; codecs=opus';
        } catch (err) {
          console.error('[WhatsApp Bot] Error descargando audio:', err);
        }
      }

      // Procesar con Gemini y las herramientas de Ayni
      try {
        const aiResponse = await processAssistantChat({
          user: {
            userId: member.userId,
            familyId: member.familyId,
            memberId: member.id,
            role: member.role,
          },
          message: textMessage || undefined,
          audioBase64,
          audioMimeType,
        });

        let replyText = aiResponse.message || 'Acción procesada correctamente.';

        if (aiResponse.widget) {
          replyText += formatWidgetForWhatsApp(aiResponse.widget);
        }

        if (aiResponse.userTranscription && !textMessage) {
          replyText = `🎙️ _"${aiResponse.userTranscription}"_\n\n` + replyText;
        }

        console.log(`[WhatsApp Bot] Respondiendo a ${rawPhone}...`);
        await sock.sendMessage(remoteJid, { text: replyText });
        console.log(`[WhatsApp Bot] ✅ Respuesta enviada.`);
      } catch (aiErr) {
        console.error('[WhatsApp Bot] Error con IA:', aiErr);
        await sock.sendMessage(remoteJid, {
          text: 'Lo siento, tuve un problema temporal al procesar tu solicitud. Por favor intenta de nuevo en unos momentos.',
        });
      }
    }
  });

  return sock;
}
