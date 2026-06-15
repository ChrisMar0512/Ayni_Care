import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { ApiResponse } from '@ayni-care/shared';
import type { MemberRole } from '@ayni-care/shared';

export interface FamilyMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: MemberRole;
  isActive: boolean;
}

export interface InviteMemberInput {
  email?: string;
  phone?: string;
  role: MemberRole;
}

export interface InviteMemberResponse {
  id: string;
  token: string;
  role: MemberRole;
  email: string | null;
  phone: string | null;
  expiresAt: string;
}

const QUERY_KEY = ['family', 'members'] as const;

export function useFamilyMembers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<FamilyMember[]>>('/api/family/members');
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useInviteMember() {
  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const res = await api.post<ApiResponse<InviteMemberResponse>>('/api/family/invite', input);
      return res.data.data!;
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/family/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
