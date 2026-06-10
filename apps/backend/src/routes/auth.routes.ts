import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { verifyOtpSchema } from '../schemas/auth.schema';
import { verifyOtp, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/logout', authenticate, logout);

export default router;
