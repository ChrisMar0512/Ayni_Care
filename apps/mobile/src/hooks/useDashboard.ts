import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { ApiResponse } from '@ayni-care/shared';

export interface DashboardItem {
  id: string;
  type: 'activity' | 'medication' | 'appointment';
  title: string;
  time: string;
  status: 'pending' | 'completed' | 'cancelled' | 'skipped' | 'in_progress';
  subtitle?: string;
  originalId: string;
  priority?: 'urgent' | 'normal' | 'low';
  assignedTo?: { id: string; name: string } | null;
  completedBy?: { id: string; name: string } | null;
  completedAt?: string | null;
  notes?: string | null;
  location?: string | null;
  doctorName?: string | null;
}

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

export function useDashboard(date: string) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, date],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardItem[]>>('/api/dashboard/daily', {
        params: { date },
      });
      return res.data.data ?? [];
    },
    staleTime: 1000 * 30, // 30 segundos
  });
}
