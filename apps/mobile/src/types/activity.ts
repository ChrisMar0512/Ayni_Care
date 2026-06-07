export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface Activity {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  status: ActivityStatus;
  priority: number;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  lastLog: {
    id: string;
    completedAt: string;
    note: string | null;
    completedBy: { name: string };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityInput {
  title: string;
  description?: string;
  scheduledAt?: string;
  assignedToId?: string;
  priority?: number;
}
