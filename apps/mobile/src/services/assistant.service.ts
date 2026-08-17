import api from './api';
import { AssistantChatRequest, AssistantChatResponse } from '../types/assistant';

export const assistantService = {
  async sendMessage(data: AssistantChatRequest): Promise<AssistantChatResponse> {
    const response = await api.post<{ success: boolean; data: AssistantChatResponse; error?: string }>(
      '/api/assistant/chat',
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al comunicarse con el asistente de IA');
    }

    return response.data.data;
  },
};
