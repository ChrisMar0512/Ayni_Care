import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Note, NoteType, CreateNoteInput } from '../types/note';
import type { ApiResponse } from '@ayni-care/shared';

const QUERY_KEY = ['notes'] as const;

export function useNotes(type?: NoteType) {
  return useQuery({
    queryKey: type ? [...QUERY_KEY, type] : QUERY_KEY,
    queryFn: async () => {
      const params = type ? `?type=${type}` : '';
      const res = await api.get<ApiResponse<Note[]>>(`/api/notes${params}`);
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      api.post<ApiResponse<Note>>('/api/notes', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
