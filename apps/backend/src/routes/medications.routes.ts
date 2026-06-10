import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createMedicationSchema,
  updateMedicationSchema,
  administerMedicationSchema,
} from '../schemas/medication.schema';
import {
  listMedications,
  createMedication,
  updateMedication,
  administerMedication,
  deleteMedication,
} from '../controllers/medications.controller';

const router = Router();

router.get('/', authenticate, requirePermission('medications:read'), listMedications);
router.post('/', authenticate, requirePermission('medications:create'), validate(createMedicationSchema), createMedication);
router.patch('/:id', authenticate, requirePermission('medications:create'), validate(updateMedicationSchema), updateMedication);
router.patch('/:id/administer', authenticate, requirePermission('medications:administer'), validate(administerMedicationSchema), administerMedication);
router.delete('/:id', authenticate, requirePermission('medications:delete'), deleteMedication);

export default router;
