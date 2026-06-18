import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { getDailyDashboard } from '../controllers/dashboard.controller';

const router = Router();

// Endpoint para obtener el dashboard diario unificado
router.get('/daily', authenticate, requirePermission('activities:read'), getDailyDashboard);

export default router;
