import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  token: z.string().startsWith('ExponentPushToken[', {
    message: 'El token debe ser un Expo Push Token válido.',
  }),
});

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
