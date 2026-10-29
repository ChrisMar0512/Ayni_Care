import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import {
  analyzeCallTranscript,
  buildMicroContextForCall,
  dispatchOutboundCall,
  handleMissedCallAttempt,
  processInductionConsent,
  triggerImmediateRedFlagAlert,
} from '../services/yuyay-call.service';
import {
  sendDailyNightReportForFamily,
  runDailyNightReportJob,
} from '../services/yuyay-report.service';
import { runSchedulerCycle } from '../services/yuyay-scheduler.service';
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
 * POST /api/yuyay/trigger-call
 * Inicia una llamada saliente (supervisión o inducción) al adulto mayor
 */
export const triggerCall = async (req: Request, res: Response) => {
  try {
    const {
      elderlyId,
      scheduledCallId,
      timeSlot = 'mañana',
      isInduction = false,
      forceSimulate = false,
    } = req.body;

    const id = elderlyId || req.params.elderlyId;

    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'elderlyId es obligatorio para iniciar una llamada.',
      });
    }

    const result = await dispatchOutboundCall({
      elderlyId: id,
      scheduledCallId,
      timeSlot,
      isInduction,
      forceSimulate,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Yuyay Controller] Error en triggerCall:', err.message || err);
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Error al iniciar llamada saliente.',
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
      status = 'completed',
      isInduction = false,
    } = req.body;

    // 1. Si la llamada no fue contestada (no_answer, busy, machine)
    if (status === 'no_answer' || status === 'busy' || status === 'machine' || status === 'failed') {
      if (scheduledCallId) {
        await handleMissedCallAttempt(scheduledCallId);
      }
      return res.status(200).json({
        success: true,
        message: `Estado de llamada '${status}' procesado con reintento.`,
      });
    }

    if (!transcript) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'La transcripción (transcript) es obligatoria para llamadas contestadas.',
      });
    }

    // 2. Buscar al adulto mayor por ID o por número de teléfono
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

    // 3. Analizar la transcripción con Gemini 2.0 Flash
    const analysis = await analyzeCallTranscript(transcript, [], isInduction);

    // 4. Si fue llamada de inducción, registrar consentimiento informado (Ley 29733)
    if (isInduction && elderly && analysis.consentGranted !== undefined) {
      await processInductionConsent({
        elderlyId: elderly.id,
        consentGranted: Boolean(analysis.consentGranted),
        recordingUrl,
        consentNotes: analysis.consentNotes,
      });
    }

    // 5. Guardar el registro de la llamada
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

      // Si había una llamada programada pendiente, marcarla como completada
      if (scheduledCallId) {
        await prisma.scheduledCall.update({
          where: { id: scheduledCallId },
          data: { status: 'completed' },
        });
      }

      // Si se detectó una bandera roja médica, alertar inmediatamente al hijo cuidador
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
        consentGranted: analysis.consentGranted,
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
    const isInduction = req.query.isInduction === 'true';

    const context = await buildMicroContextForCall(elderlyId, timeSlot, isInduction);
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
 * POST /api/yuyay/cron y GET /api/yuyay/cron
 * Disparador para cron jobs externos (Vercel Cron, Railway, cron-job.org)
 */
export const runSchedulerCron = async (req: Request, res: Response) => {
  try {
    const summary = await runSchedulerCycle();
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Error ejecutando ciclo del scheduler.',
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

/**
 * POST /api/yuyay/test-scenario
 * Endpoint interactivo para probar de inmediato los flujos clave del Investment Memo
 */
export const testScenario = async (req: Request, res: Response) => {
  try {
    const {
      scenario = 'routine_success', // 'routine_success' | 'red_flag_alert' | 'missed_calls' | 'induction'
      elderlyId,
      seniorPhone,
      childPhone,
      childName = 'Hijo Cuidador',
      seniorName = 'Don Carlos',
    } = req.body;

    if (scenario === 'red_flag_alert') {
      const transcript =
        'Yuyay: ¡Buenos días don Carlos! ¿Cómo amaneció hoy?\n' +
        'Carlos: Ay señorita, la verdad me siento mal, tengo un dolor fuerte en el pecho que me aprieta y me siento mareado.\n' +
        'Yuyay: Don Carlos, por favor tome asiento de inmediato. Le estamos avisando a su familia y le recomendamos descansar.';

      const analysis = await analyzeCallTranscript(transcript);
      if (childPhone) {
        await triggerImmediateRedFlagAlert({
          childPhone,
          childName,
          seniorName,
          reason: analysis.redFlagReason || 'Dolor precordial intenso y mareo repentino',
          transcriptSnippet: transcript,
        });
      }

      return res.status(200).json({
        success: true,
        scenario: 'red_flag_alert',
        analysis,
        alertSentTo: childPhone || 'Simulado',
      });
    }

    if (scenario === 'induction') {
      const transcript =
        'Yuyay: Buenas tardes don Carlos, le saluda Yuyay, el servicio de acompañamiento telefónico que coordinó su familia. ¿Estaría de acuerdo en recibir nuestras llamadas diarias para acompañarlo con sus medicamentos?\n' +
        'Carlos: Sí señorita, me parece muy bien y me alegra su llamada, acepto con gusto.';

      const analysis = await analyzeCallTranscript(transcript, [], true);
      return res.status(200).json({
        success: true,
        scenario: 'induction',
        analysis,
        consentGranted: analysis.consentGranted,
      });
    }

    if (scenario === 'nightly_report' && req.body.familyId) {
      const ok = await sendDailyNightReportForFamily(req.body.familyId);
      return res.status(200).json({
        success: ok,
        scenario: 'nightly_report',
        sent: ok,
      });
    }

    // Default: Routine success
    const routineTranscript =
      'Yuyay: ¡Buenos días don Carlos! ¿Cómo amaneció hoy?\n' +
      'Carlos: Hola señorita, todo tranquilo, tomando desayuno.\n' +
      'Yuyay: Le llamo para recordarle su Losartán y su Metformina. ¿Ya las tiene a la mano?\n' +
      'Carlos: Sí, justo aquí las tengo y me las tomo con agua ahorita mismo.\n' +
      'Yuyay: Excelente don Carlos, ¿alguna molestia hoy?\n' +
      'Carlos: Ninguna, todo bien gracias a Dios.';

    const routineAnalysis = await analyzeCallTranscript(routineTranscript, ['Losartán', 'Metformina']);
    return res.status(200).json({
      success: true,
      scenario: 'routine_success',
      analysis: routineAnalysis,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Error ejecutando escenario de prueba.',
    });
  }
};

/**
 * POST /api/yuyay/setup-test-patient
 * Crea un paciente de prueba completo en Supabase (Familia, Cuidador, Adulto Mayor y Medicinas)
 * para realizar la prueba de llamada 100% personalizada.
 */
export const setupTestPatient = async (req: Request, res: Response) => {
  try {
    const {
      seniorName = 'Don Carlos',
      seniorPhone,
      childName = 'Christian',
      childPhone,
      conditions = ['Hipertensión arterial', 'Diabetes tipo 2'],
      medications = [
        { name: 'Losartán', dosage: '50mg', instructions: '1 tableta con el desayuno', frequency: 'una vez al día', times: ['08:00'] },
        { name: 'Metformina', dosage: '850mg', instructions: '1 tableta con el desayuno', frequency: 'una vez al día', times: ['08:00'] },
      ],
      preferredCallTimes = ['08:00', '20:00'],
    } = req.body;

    if (!seniorPhone) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'seniorPhone (número donde sonará la llamada) es obligatorio.',
      });
    }

    const cleanSeniorPhone = seniorPhone.replace(/\D/g, '');
    const cleanChildPhone = childPhone ? childPhone.replace(/\D/g, '') : cleanSeniorPhone;

    // 1. Crear Familia de prueba
    const family = await prisma.family.create({
      data: {
        name: `Familia de ${seniorName}`,
      },
    });

    // 2. Crear Cuidador Principal (hijo)
    const caregiver = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: `test_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: childName,
        phone: cleanChildPhone,
        role: 'primary_caregiver',
        isActive: true,
      },
    });

    // 3. Crear Adulto Mayor
    const elderly = await prisma.elderlyPerson.create({
      data: {
        familyId: family.id,
        name: seniorName,
        phone: cleanSeniorPhone,
        conditions,
        allergies: [],
        preferredCallTimes,
        consentVerbal: true,
        consentDate: new Date(),
      },
    });

    // 4. Crear Medicamentos
    for (const med of medications) {
      await prisma.medication.create({
        data: {
          familyId: family.id,
          name: med.name,
          dosage: med.dosage || '1 dosis',
          instructions: med.instructions || null,
          frequency: med.frequency || 'una vez al día',
          times: med.times || ['08:00'],
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    // 5. Crear llamadas programadas (mañana y noche)
    await prisma.scheduledCall.createMany({
      data: [
        {
          elderlyId: elderly.id,
          scheduledTime: preferredCallTimes[0] || '08:00',
          timeSlot: 'mañana',
          status: 'pending',
        },
        {
          elderlyId: elderly.id,
          scheduledTime: preferredCallTimes[1] || '20:00',
          timeSlot: 'noche',
          status: 'pending',
        },
      ],
    });

    return res.status(201).json({
      success: true,
      data: {
        familyId: family.id,
        elderlyId: elderly.id,
        seniorName: elderly.name,
        seniorPhone: elderly.phone,
        childName: caregiver.name,
        childPhone: caregiver.phone,
        medicationsCount: medications.length,
        message: `Paciente de prueba '${seniorName}' configurado en Supabase con éxito.`,
      },
    });
  } catch (err: any) {
    console.error('[Yuyay Controller] Error en setupTestPatient:', err.message || err);
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Error al configurar paciente de prueba.',
    });
  }
};

