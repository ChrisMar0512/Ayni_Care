import { z } from 'zod';

export const createFamilySchema = z.object({
  familyName: z.string().min(1).max(100),
  memberName: z.string().min(1).max(100),
  memberPhone: z.string().optional(),
  memberEmail: z.string().email().optional(),
  elderlyName: z.string().min(1).max(100).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['primary_caregiver', 'remote_family', 'weekend_helper', 'paid_caregiver']),
}).refine(data => data.email || data.phone, {
  message: 'Se requiere email o teléfono para enviar la invitación',
});

export const joinFamilySchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;
