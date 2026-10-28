import { Router } from 'express';
import {
  registerLead,
  handleVoiceWebhook,
  getRuntimeContext,
  triggerNightlyReport,
} from '../controllers/yuyay.controller';

const router = Router();

// Captura de leads desde Landing / Web
router.post('/register-lead', registerLead);

// Webhook de llamadas de voz (Plivo / Retell / Vapi / Twilio)
router.post('/voice-webhook', handleVoiceWebhook);

// Micro-contexto para el agente de voz
router.get('/runtime-context/:elderlyId', getRuntimeContext);

// Disparador de reporte nocturno (cron o manual)
router.post('/send-nightly-report', triggerNightlyReport);

export default router;
