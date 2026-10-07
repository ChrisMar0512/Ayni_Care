import { Router } from 'express';
import { authenticate, authenticateNewUser } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { createFamilySchema, inviteMemberSchema, joinFamilySchema } from '../schemas/family.schema';
import {
  createFamily,
  inviteMember,
  joinFamily,
  listMembers,
  removeMember,
} from '../controllers/family.controller';

const router = Router();

// No family required — user is authenticated with Supabase but hasn't joined yet
router.post('/', authenticateNewUser, validate(createFamilySchema), createFamily);
router.post('/join', authenticateNewUser, validate(joinFamilySchema), joinFamily);

// Requires full family membership
router.post('/invite', authenticate, requirePermission('family:invite'), validate(inviteMemberSchema), inviteMember);
router.get('/members', authenticate, listMembers);
router.delete('/members/:id', authenticate, requirePermission('family:remove'), removeMember);

export default router;
