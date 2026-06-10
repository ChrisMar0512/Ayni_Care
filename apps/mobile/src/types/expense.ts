export type ExpenseCategory =
  | 'medications'
  | 'medical'
  | 'food'
  | 'transport'
  | 'hygiene'
  | 'equipment'
  | 'other';

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  amount: string; // Prisma Decimal serializes as string
  isPaid: boolean;
  paidAt: string | null;
  member: { id: string; name: string };
}

export interface Expense {
  id: string;
  familyId: string;
  paidById: string;
  title: string;
  amount: string; // Prisma Decimal serializes as string
  currency: string;
  category: ExpenseCategory;
  date: string;
  receipt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  paidBy: { id: string; name: string };
  splits: ExpenseSplit[];
}

export interface CreateExpenseSplitInput {
  memberId: string;
  amount: number;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  currency?: string;
  category: ExpenseCategory;
  date: string;
  receipt?: string;
  notes?: string;
  splits: CreateExpenseSplitInput[];
}
