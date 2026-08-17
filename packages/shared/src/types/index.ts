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

export type AssistantWidgetType =
  | 'medication_dose_logged'
  | 'activity_created'
  | 'activity_completed'
  | 'expense_created'
  | 'appointment_created'
  | 'note_created'
  | 'daily_summary';

export interface AssistantWidget {
  type: AssistantWidgetType;
  title: string;
  data: Record<string, any>;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  widget?: AssistantWidget;
  actionsExecuted?: string[];
  isPending?: boolean;
}

export interface AssistantChatRequest {
  message?: string;
  audioBase64?: string;
  audioMimeType?: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AssistantChatResponse {
  message: string;
  widget?: AssistantWidget;
  actionsExecuted?: string[];
}

