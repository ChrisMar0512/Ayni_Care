import { Request, Response, NextFunction } from 'express';
import { NoteType } from '@prisma/client';
import { prisma } from '../prisma/client';
import { broadcast } from '../services/realtime.service';
import { CreateNoteInput } from '../schemas/note.schema';

const VALID_NOTE_TYPES: NoteType[] = ['general', 'medical', 'handoff', 'symptom', 'observation'];

// GET /api/notes
export const listNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { type } = req.query;

    if (typeof type === 'string' && !VALID_NOTE_TYPES.includes(type as NoteType)) {
      res.status(400).json({
        success: false,
        data: null,
        error: `Tipo inválido. Valores permitidos: ${VALID_NOTE_TYPES.join(', ')}`,
      });
      return;
    }

    const notes = await prisma.note.findMany({
      where: {
        familyId,
        deletedAt: null,
        ...(typeof type === 'string' ? { type: type as NoteType } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
};

// POST /api/notes
export const createNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId, memberId } = req.user;
    const { title, content, type } = req.validatedBody as CreateNoteInput;

    const note = await prisma.note.create({
      data: {
        familyId,
        authorId: memberId,
        title,
        content,
        type,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    await broadcast(familyId, 'note:created', note);

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notes/:id — soft delete
// Solo el autor o un primary_caregiver puede eliminar la nota
export const deleteNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId, memberId, role } = req.user;
    const { id } = req.params;

    const existing = await prisma.note.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Nota no encontrada' });
      return;
    }

    const canDelete = existing.authorId === memberId || role === 'primary_caregiver';

    if (!canDelete) {
      res.status(403).json({
        success: false,
        data: null,
        error: 'Solo el autor o el cuidador principal puede eliminar esta nota',
      });
      return;
    }

    await prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await broadcast(familyId, 'note:deleted', { id });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
