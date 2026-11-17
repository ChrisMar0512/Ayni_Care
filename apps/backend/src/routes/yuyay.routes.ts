import { Router } from 'express';
import {
  registerLead,
  handleVoiceWebhook,
  getRuntimeContext,
  triggerCall,
  triggerNightlyReport,
  runSchedulerCron,
  testScenario,
  setupTestPatient,
  updateCallPreferences,
  enrollPatient,
} from '../controllers/yuyay.controller';
import {
  blockInProduction,
  requireVapiSignature,
  requireYuyayAdmin,
  requireYuyayCron,
} from '../middleware/yuyay-auth.middleware';

const router = Router();

// Captura de leads desde Landing / Web (Lovable)
// Público (formulario web). Lo limita el rate limiter general de /api.
router.post('/register-lead', registerLead);

// Disparador de llamadas salientes (Plivo / Twilio / Vapi / Simulación)
router.post('/trigger-call', requireYuyayAdmin, triggerCall);
router.post('/trigger-call/:elderlyId', requireYuyayAdmin, triggerCall);

// Webhook de llamadas de voz finalizadas o eventos de llamada
router.post('/voice-webhook', requireVapiSignature, handleVoiceWebhook);

// Micro-contexto clínico optimizado (<150 tokens) para el agente de voz
router.get('/runtime-context/:elderlyId', requireYuyayAdmin, getRuntimeContext);

// Disparador del ciclo de supervisión / scheduler (Llamadas pendientes, reintentos y reporte nocturno)
router.get('/cron', requireYuyayCron, runSchedulerCron);
router.post('/cron', requireYuyayCron, runSchedulerCron);

// Disparador manual del reporte nocturno consolidado (20:30 hrs)
router.post('/send-nightly-report', requireYuyayAdmin, triggerNightlyReport);

// Pruebas rápidas de escenarios clínicos y alertas de WhatsApp
router.post('/test-scenario', blockInProduction, requireYuyayAdmin, testScenario);

// Creación rápida de paciente de prueba en Supabase para llamadas personalizadas
router.post('/setup-test-patient', blockInProduction, requireYuyayAdmin, setupTestPatient);

// Inscripción de una familia (desde un lead o con datos directos) + llamada de inducción
router.post('/enroll', requireYuyayAdmin, enrollPatient);

// Actualizar horarios y frecuencia de llamadas (1, 2 o 3 llamadas al día)
router.patch('/preferences/:elderlyId', requireYuyayAdmin, updateCallPreferences);

export default router;
