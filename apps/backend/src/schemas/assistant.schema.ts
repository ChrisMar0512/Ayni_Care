import { z } from 'zod';

export const chatAssistantSchema = z.object({
  message: z.string().max(2000).optional(),
  audioBase64: z.string().optional(),
  audioMimeType: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(30)
    .optional()
    .default([]),
}).refine((data) => data.message || data.audioBase64, {
  message: 'Debes proporcionar un mensaje de texto o un audio.',
});

export type ChatAssistantInput = z.infer<typeof chatAssistantSchema>;
