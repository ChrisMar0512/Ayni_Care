export type AppointmentType = 'medical' | 'therapy' | 'lab' | 'pharmacy' | 'other';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface Appointment {
  id: string;
  familyId: string;
  title: string;
  type: AppointmentType;
  scheduledAt: string;
  location: string | null;
  doctorName: string | null;
  durationMin: number | null;
  notes: string | null;
  status: AppointmentStatus;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  title: string;
  type: AppointmentType;
  scheduledAt: string;
  location?: string;
  doctorName?: string;
  durationMin?: number;
  notes?: string;
}
