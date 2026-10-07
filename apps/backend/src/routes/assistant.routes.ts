import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { chatAssistantSchema } from '../schemas/assistant.schema';
import { chatWithAssistant, transcribeVoice } from '../controllers/assistant.controller';

const router = Router();

// Todas las rutas del asistente requieren autenticación de miembro de familia
router.use(authenticate);

// POST /api/assistant/chat
router.post('/chat', validate(chatAssistantSchema), chatWithAssistant);

// POST /api/assistant/transcribe
router.post('/transcribe', transcribeVoice);

export default router;
