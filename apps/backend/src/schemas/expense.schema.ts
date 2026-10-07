import { z } from 'zod';

const splitSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive(),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3).default('PEN'),
  category: z.enum(['medications', 'medical', 'food', 'transport', 'hygiene', 'equipment', 'other']),
  date: z.string().datetime(),
  receipt: z.string().url().optional(),
  notes: z.string().max(500).optional(),
  splits: z.array(splitSchema).min(1),
}).refine(
  (data) => {
    const splitsTotal = data.splits.reduce((sum, s) => sum + s.amount, 0);
    return Math.abs(splitsTotal - data.amount) < 0.01;
  },
  { message: 'La suma de los splits debe ser igual al monto total del gasto' },
);

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
