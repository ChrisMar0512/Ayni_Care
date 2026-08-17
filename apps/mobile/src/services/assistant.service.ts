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

  async transcribeAudio(audioBase64: string, audioMimeType: string = 'audio/m4a'): Promise<string> {
    const response = await api.post<{ success: boolean; data: { text: string }; error?: string }>(
      '/api/assistant/transcribe',
      { audioBase64, audioMimeType }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al transcribir la nota de voz');
    }

    return response.data.data.text;
  },
};
