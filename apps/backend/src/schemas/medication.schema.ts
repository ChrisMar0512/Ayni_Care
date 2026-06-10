import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createMedicationSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().min(1).max(100),
  form: z.string().max(50).optional(),
  frequency: z.string().min(1).max(100),
  times: z.array(z.string().regex(timeRegex, 'Formato de hora inválido. Usa HH:MM')).min(1),
  instructions: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  stock: z.number().int().nonnegative().optional(),
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dosage: z.string().min(1).max(100).optional(),
  form: z.string().max(50).nullable().optional(),
  frequency: z.string().min(1).max(100).optional(),
  times: z.array(z.string().regex(timeRegex, 'Formato de hora inválido. Usa HH:MM')).min(1).optional(),
  instructions: z.string().max(500).nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Se requiere al menos un campo para actualizar',
});

export const administerMedicationSchema = z.object({
  skipped: z.boolean().default(false),
  skipReason: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type AdministerMedicationInput = z.infer<typeof administerMedicationSchema>;
