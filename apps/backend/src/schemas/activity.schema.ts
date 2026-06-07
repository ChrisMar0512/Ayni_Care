import { z } from 'zod';

export const createActivitySchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  priority: z.enum(['urgent', 'normal', 'low']).default('normal'),
});

export const updateActivitySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'custom']).nullable().optional(),
  priority: z.enum(['urgent', 'normal', 'low']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'skipped']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Se requiere al menos un campo para actualizar',
});

export const completeActivitySchema = z.object({
  notes: z.string().max(500).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type CompleteActivityInput = z.infer<typeof completeActivitySchema>;
