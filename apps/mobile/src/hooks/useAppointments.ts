import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Appointment, CreateAppointmentInput } from '../types/appointment';
import type { ApiResponse } from '@ayni-care/shared';

const QUERY_KEY = ['appointments'] as const;

export function useAppointments() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<Appointment[]>>('/api/appointments');
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      api.post<ApiResponse<Appointment>>('/api/appointments', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
