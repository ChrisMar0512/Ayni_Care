import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000),
  type: z.enum(['general', 'medical', 'handoff', 'symptom', 'observation']).default('general'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
