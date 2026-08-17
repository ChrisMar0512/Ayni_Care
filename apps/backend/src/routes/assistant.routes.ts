import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { chatAssistantSchema } from '../schemas/assistant.schema';
import { chatWithAssistant } from '../controllers/assistant.controller';

const router = Router();

// Todas las rutas del asistente requieren autenticación de miembro de familia
router.use(authenticate);

// POST /api/assistant/chat
router.post('/chat', validate(chatAssistantSchema), chatWithAssistant);

export default router;
