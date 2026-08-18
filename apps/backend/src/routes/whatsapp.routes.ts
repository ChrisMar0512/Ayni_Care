import { Router } from 'express';
import { handleIncomingWhatsApp } from '../controllers/whatsapp.controller';

const router = Router();

// Endpoint del Webhook de WhatsApp de Twilio
// Twilio envía peticiones POST urlencoded a este endpoint
router.post('/webhook', handleIncomingWhatsApp);

export default router;
