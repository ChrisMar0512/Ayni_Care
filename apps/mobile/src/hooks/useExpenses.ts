import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Expense, CreateExpenseInput } from '../types/expense';
import type { ApiResponse } from '@ayni-care/shared';

const QUERY_KEY = ['expenses'] as const;

export function useExpenses() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<Expense[]>>('/api/expenses');
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      api.post<ApiResponse<Expense>>('/api/expenses', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function usePaySplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, splitId }: { expenseId: string; splitId: string }) =>
      api.patch(`/api/expenses/${expenseId}/splits/${splitId}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
