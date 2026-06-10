import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Medication, CreateMedicationInput } from '../types/medication';
import type { ApiResponse } from '@ayni-care/shared';

const QUERY_KEY = ['medications'] as const;

export function useMedications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<Medication[]>>('/api/medications');
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMedicationInput) =>
      api.post<ApiResponse<Medication>>('/api/medications', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useAdministerMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      skipped = false,
      skipReason,
      notes,
    }: {
      id: string;
      skipped?: boolean;
      skipReason?: string;
      notes?: string;
    }) =>
      api.patch(`/api/medications/${id}/administer`, { skipped, skipReason, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/medications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
