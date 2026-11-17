import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora en formato HH:mm (ej. "08:30")');
const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length >= 9 && v.length <= 15, 'Teléfono inválido');

const medicationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  dosage: z.string().trim().min(1).max(100).default('según receta'),
  instructions: z.string().trim().max(300).optional(),
  times: z.array(hhmm).max(6).optional(),
});

/**
 * POST /api/yuyay/enroll
 * Inscribe a una familia en Yuyay. Se puede partir de un lead de la landing (leadId)
 * o enviar todos los datos directamente. Lo enviado en el body tiene prioridad sobre el lead.
 */
export const enrollSchema = z.object({
  leadId: z.string().uuid().optional(),
  childName: z.string().trim().min(1).max(100).optional(),
  childPhone: phone.optional(),
  childEmail: z.string().email().optional(),
  seniorName: z.string().trim().min(1).max(100).optional(),
  seniorPhone: phone.optional(),
  conditions: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  allergies: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  medications: z.array(medicationSchema).max(20).optional(),
  preferredCallTimes: z.array(hhmm).min(1).max(3).optional(),
  /** Si es true (por defecto), se llama al adulto mayor de inmediato para pedir su consentimiento. */
  startInduction: z.boolean().default(true),
});

export type EnrollInput = z.infer<typeof enrollSchema>;
