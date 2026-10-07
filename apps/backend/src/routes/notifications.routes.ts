import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerPushTokenSchema } from '../schemas/notification.schema';
import { registerPushToken } from '../controllers/notifications.controller';

const router = Router();

// Endpoint para registrar el token de notificaciones push
router.post('/register-token', authenticate, validate(registerPushTokenSchema), registerPushToken);

export default router;
