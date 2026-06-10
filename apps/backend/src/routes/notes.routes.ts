import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { createNoteSchema } from '../schemas/note.schema';
import { listNotes, createNote, deleteNote } from '../controllers/notes.controller';

const router = Router();

router.get('/', authenticate, requirePermission('notes:read'), listNotes);
router.post('/', authenticate, requirePermission('notes:create'), validate(createNoteSchema), createNote);
router.delete('/:id', authenticate, requirePermission('notes:read'), deleteNote);

export default router;
