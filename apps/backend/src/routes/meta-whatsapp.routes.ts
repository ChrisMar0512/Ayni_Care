import { Router } from 'express';
import {
  verifyMetaWebhook,
  handleIncomingMetaWebhook,
} from '../controllers/meta-whatsapp.controller';

const router = Router();

// Endpoint de verificación inicial por Meta (GET)
router.get('/webhook', verifyMetaWebhook);

// Endpoint de recepción de mensajes y eventos por Meta (POST)
router.post('/webhook', handleIncomingMetaWebhook);

export default router;
