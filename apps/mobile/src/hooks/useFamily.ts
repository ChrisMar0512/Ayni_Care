import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { ApiResponse } from '@ayni-care/shared';
import type { MemberRole } from '@ayni-care/shared';

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  isActive: boolean;
}

export function useFamilyMembers() {
  return useQuery({
    queryKey: ['family', 'members'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FamilyMember[]>>('/api/family/members');
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
