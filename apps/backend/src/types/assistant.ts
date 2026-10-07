import { MemberRole } from '@prisma/client';

export type AssistantWidgetType =
  | 'medication_dose_logged'
  | 'medication_created'
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
  userTranscription?: string;
  widget?: AssistantWidget;
  actionsExecuted?: string[];
}
