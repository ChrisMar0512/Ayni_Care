import { Router } from 'express';
import {
  handleTelegramWebhook,
  setupTelegramWebhookEndpoint,
} from '../controllers/telegram.controller';

const router = Router();

// Endpoint webhook donde Telegram envía los mensajes y notas de voz (POST)
router.post('/webhook', handleTelegramWebhook);

// Endpoint utilitario para configurar o renovar el webhook con Telegram (GET)
router.get('/setup-webhook', setupTelegramWebhookEndpoint);

export default router;
