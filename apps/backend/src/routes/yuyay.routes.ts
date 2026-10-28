import { Router } from 'express';
import {
  registerLead,
  handleVoiceWebhook,
  getRuntimeContext,
  triggerCall,
  triggerNightlyReport,
  runSchedulerCron,
  testScenario,
} from '../controllers/yuyay.controller';

const router = Router();

// Captura de leads desde Landing / Web (Lovable)
router.post('/register-lead', registerLead);

// Disparador de llamadas salientes (Plivo / Twilio / Vapi / Simulación)
router.post('/trigger-call', triggerCall);
router.post('/trigger-call/:elderlyId', triggerCall);

// Webhook de llamadas de voz finalizadas o eventos de llamada
router.post('/voice-webhook', handleVoiceWebhook);

// Micro-contexto clínico optimizado (<150 tokens) para el agente de voz
router.get('/runtime-context/:elderlyId', getRuntimeContext);

// Disparador del ciclo de supervisión / scheduler (Llamadas pendientes, reintentos y reporte nocturno)
router.get('/cron', runSchedulerCron);
router.post('/cron', runSchedulerCron);

// Disparador manual del reporte nocturno consolidado (20:30 hrs)
router.post('/send-nightly-report', triggerNightlyReport);

// Pruebas rápidas de escenarios clínicos y alertas de WhatsApp
router.post('/test-scenario', testScenario);

export default router;
