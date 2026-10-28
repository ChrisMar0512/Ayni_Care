import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import {
  analyzeCallTranscript,
  buildMicroContextForCall,
  triggerImmediateRedFlagAlert,
} from '../services/yuyay-call.service';
import {
  sendDailyNightReportForFamily,
  runDailyNightReportJob,
} from '../services/yuyay-report.service';
import { sendMetaWhatsAppMessage } from '../services/meta-whatsapp.service';

/**
 * POST /api/yuyay/register-lead
 * Captura registros de hijos y adultos mayores desde la landing page (Lovable / Web)
 */
export const registerLead = async (req: Request, res: Response) => {
  try {
    const {
      childName,
      childPhone,
      childEmail,
      country = 'PE',
      seniorName,
      seniorPhone,
      seniorConditions,
      seniorMeds,
      callPreferences,
      planInterested = 'tranquilidad_familiar',
    } = req.body;

    if (!childName || !childPhone || !seniorName || !seniorPhone) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'childName, childPhone, seniorName y seniorPhone son campos obligatorios.',
      });
    }

    const lead = await prisma.yuyayLead.create({
      data: {
        childName,
        childPhone: childPhone.replace(/\D/g, ''),
        childEmail,
        country,
        seniorName,
        seniorPhone: seniorPhone.replace(/\D/g, ''),
        seniorConditions,
        seniorMeds,
        callPreferences,
        planInterested,
        status: 'lead',
      },
    });

    // Mensaje automático de confirmación por WhatsApp al hijo
    const cleanChildPhone = childPhone.replace(/\D/g, '');
    const welcomeText =
      `🌿 *¡Bienvenido a Yuyay, ${childName}!* 🌿\n\n` +
      `Hemos registrado con éxito a tu familiar *${seniorName}* para el piloto de teleasistencia.\n\n` +
      `📞 *Próximo paso:* Nuestro equipo revisará los horarios de llamada programados (${callPreferences || 'Mañana y noche'}). Antes de la primera llamada regular, realizaremos una breve llamada de inducción a Don/Doña ${seniorName} para explicarle el servicio y solicitar su consentimiento verbal.\n\n` +
      `Recibirás todas las alertas y tus reportes nocturnos en este mismo chat de WhatsApp.\n\n` +
      `_Equipo Yuyay — Cuidando a quienes más quieres._`;

    try {
      await sendMetaWhatsAppMessage({
        to: cleanChildPhone,
        text: welcomeText,
      });
    } catch (msgErr) {
      console.warn('[Yuyay Lead] No se pudo enviar WhatsApp de bienvenida:', msgErr);
    }

    return res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (err: any) {
    console.error('[Yuyay Controller] Error en registerLead:', err.message || err);
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Error interno al registrar el lead de Yuyay.',
    });
  }
};

/**
 * POST /api/yuyay/voice-webhook
 * Webhook que recibe los datos y transcripción de una llamada de voz finalizada
 */
export const handleVoiceWebhook = async (req: Request, res: Response) => {
  try {
    const {
      elderlyId,
      seniorPhone,
      transcript,
      durationSeconds = 0,
      recordingUrl,
      externalCallId,
      scheduledCallId,
    } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'La transcripción (transcript) es obligatoria.',
      });
    }

    // Buscar al adulto mayor por ID o por número de teléfono
    let elderly = null;
    if (elderlyId) {
      elderly = await prisma.elderlyPerson.findUnique({
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
    } else if (seniorPhone) {
      const cleanPhone = seniorPhone.replace(/\D/g, '');
      elderly = await prisma.elderlyPerson.findFirst({
        where: { phone: { contains: cleanPhone } },
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
    }

    // Analizar la transcripción con Gemini 2.0 Flash
    const analysis = await analyzeCallTranscript(transcript);

    // Guardar el registro de la llamada
    let callLog = null;
    if (elderly) {
      callLog = await prisma.callLog.create({
        data: {
          elderlyId: elderly.id,
          scheduledCallId: scheduledCallId || null,
          externalCallId,
          durationSeconds: Number(durationSeconds) || 0,
          recordingUrl,
          transcript,
          medsConfirmed: analysis.medsConfirmed as any,
          mood: analysis.mood,
          symptoms: analysis.symptoms,
          hasRedFlag: analysis.hasRedFlag,
          redFlagReason: analysis.redFlagReason,
          status: 'answered',
        },
      });

      // Si se detectó una bandera roja, alertar inmediatamente al hijo cuidador
      if (analysis.hasRedFlag) {
        const caregiver = elderly.family.members[0];
        if (caregiver && caregiver.phone) {
          await triggerImmediateRedFlagAlert({
            childPhone: caregiver.phone,
            childName: caregiver.name,
            seniorName: elderly.name,
            reason: analysis.redFlagReason || 'Molestia o síntoma inusual reportado',
            transcriptSnippet: transcript,
          });

          await prisma.callLog.update({
            where: { id: callLog.id },
            data: { alertSentAt: new Date() },
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        analysis,
        callLogId: callLog?.id || null,
        hasRedFlag: analysis.hasRedFlag,
      },
    });
  } catch (err: any) {
    console.error('[Yuyay Controller] Error en handleVoiceWebhook:', err.message || err);
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Error procesando el webhook de llamada de voz.',
    });
  }
};

/**
 * GET /api/yuyay/runtime-context/:elderlyId
 * Entrega el micro-contexto (menos de 150 tokens) al agente de voz antes de iniciar la llamada
 */
export const getRuntimeContext = async (req: Request, res: Response) => {
  try {
    const { elderlyId } = req.params;
    const timeSlot = (req.query.timeSlot as 'mañana' | 'tarde' | 'noche') || 'mañana';

    const context = await buildMicroContextForCall(elderlyId, timeSlot);
    if (!context) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Adulto mayor no encontrado.',
      });
    }

    return res.status(200).json({
      success: true,
      data: context,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Error obteniendo runtime context.',
    });
  }
};

/**
 * POST /api/yuyay/send-nightly-report
 * Dispara el reporte nocturno manual para pruebas o por cron job
 */
export const triggerNightlyReport = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.body;

    if (familyId) {
      const ok = await sendDailyNightReportForFamily(familyId);
      return res.status(200).json({
        success: ok,
        data: { familyId, sent: ok },
      });
    }

    const result = await runDailyNightReportJob();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Error disparando reportes nocturnos.',
    });
  }
};
