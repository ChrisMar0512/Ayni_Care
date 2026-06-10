// Tipos compartidos entre backend y mobile.
// Se agregan conforme se implementan los dominios.

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error?: string;
};

export type MemberRole =
  | 'primary_caregiver'
  | 'remote_family'
  | 'weekend_helper'
  | 'paid_caregiver';
