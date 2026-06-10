import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createActivitySchema,
  updateActivitySchema,
  completeActivitySchema,
} from '../schemas/activity.schema';
import {
  listActivities,
  createActivity,
  updateActivity,
  completeActivity,
  deleteActivity,
} from '../controllers/activities.controller';

const router = Router();

router.get('/', authenticate, requirePermission('activities:read'), listActivities);
router.post('/', authenticate, requirePermission('activities:create'), validate(createActivitySchema), createActivity);
router.patch('/:id', authenticate, requirePermission('activities:create'), validate(updateActivitySchema), updateActivity);
router.patch('/:id/complete', authenticate, requirePermission('activities:complete'), validate(completeActivitySchema), completeActivity);
router.delete('/:id', authenticate, requirePermission('activities:delete'), deleteActivity);

export default router;
