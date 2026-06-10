import { z } from 'zod';

export const createAppointmentSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['medical', 'therapy', 'lab', 'pharmacy', 'other']),
  scheduledAt: z.string().datetime(),
  location: z.string().max(300).optional(),
  doctorName: z.string().max(150).optional(),
  durationMin: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['medical', 'therapy', 'lab', 'pharmacy', 'other']).optional(),
  scheduledAt: z.string().datetime().optional(),
  location: z.string().max(300).nullable().optional(),
  doctorName: z.string().max(150).nullable().optional(),
  durationMin: z.number().int().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Se requiere al menos un campo para actualizar',
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
