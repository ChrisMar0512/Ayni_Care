import { z } from 'zod';

export const verifyOtpSchema = z.object({
  type: z.enum(['email', 'sms']),
  token: z.string().min(4).max(8),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: 'Se requiere email o teléfono',
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
