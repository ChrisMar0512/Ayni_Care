import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Activity, CreateActivityInput } from '../types/activity';
import type { ApiResponse } from '@ayni-care/shared';

const QUERY_KEY = ['activities'] as const;

export function useActivities(date?: string) {
  return useQuery({
    queryKey: date ? [...QUERY_KEY, date] : QUERY_KEY,
    queryFn: async () => {
      const params = date ? { date } : {};
      const res = await api.get<ApiResponse<Activity[]>>('/api/activities', { params });
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateActivityInput) =>
      api.post<ApiResponse<Activity>>('/api/activities', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCompleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.patch<ApiResponse<Activity>>(`/api/activities/${id}/complete`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
