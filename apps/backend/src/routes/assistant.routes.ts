import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { chatAssistantSchema } from '../schemas/assistant.schema';
import {
  chatWithAssistant,
  transcribeVoice,
  confirmAssistantAction,
  parseFormWithAI,
} from '../controllers/assistant.controller';

const router = Router();

// Todas las rutas del asistente requieren autenticación de miembro de familia
router.use(authenticate);

// POST /api/assistant/chat
router.post('/chat', validate(chatAssistantSchema), chatWithAssistant);

// POST /api/assistant/transcribe
router.post('/transcribe', transcribeVoice);

// POST /api/assistant/confirm-action
router.post('/confirm-action', confirmAssistantAction);

// POST /api/assistant/parse-form
router.post('/parse-form', parseFormWithAI);

export default router;
