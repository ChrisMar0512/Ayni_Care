import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas/appointment.schema';
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointments.controller';

const router = Router();

router.get('/', authenticate, requirePermission('appointments:read'), listAppointments);
router.post('/', authenticate, requirePermission('appointments:create'), validate(createAppointmentSchema), createAppointment);
router.patch('/:id', authenticate, requirePermission('appointments:create'), validate(updateAppointmentSchema), updateAppointment);
router.delete('/:id', authenticate, requirePermission('appointments:delete'), deleteAppointment);

export default router;
