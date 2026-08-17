import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { assistantService } from '../services/assistant.service';
import { AssistantChatMessage, AssistantChatRequest } from '../types/assistant';

const INITIAL_MESSAGE: AssistantChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content:
    '¡Hola! Soy Ayni, tu asistente de cuidado familiar 🌿.\n\nPuedes contarme qué pastillas le diste a tu familiar, registrar compras o gastos, pedirme el resumen del día o agendar citas médicas con tu voz o escribiendo.',
  createdAt: new Date().toISOString(),
};

export function useAssistant() {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async ({ message, audioBase64, audioMimeType }: AssistantChatRequest) => {
      if (!message && !audioBase64) return;

      const userMsgId = `user-${Date.now()}`;
      const userMsg: AssistantChatMessage = {
        id: userMsgId,
        role: 'user',
        content: message || '🎤 (Nota de voz)',
        createdAt: new Date().toISOString(),
      };

      const pendingAssistantId = `assistant-pending-${Date.now()}`;
      const pendingAssistantMsg: AssistantChatMessage = {
        id: pendingAssistantId,
        role: 'assistant',
        content: 'Pensando...',
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      setMessages((prev) => [...prev, userMsg, pendingAssistantMsg]);
      setIsLoading(true);
      setError(null);

      try {
        // Enviar solo los últimos 6 mensajes como contexto histórico
        const history = messages
          .filter((m) => !m.isPending && m.id !== 'welcome-msg')
          .slice(-6)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        const response = await assistantService.sendMessage({
          message,
          audioBase64,
          audioMimeType,
          history,
        });

        // Actualizar mensaje de usuario (con la transcripción si fue audio) y el mensaje de respuesta de la IA
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === userMsgId && response.userTranscription) {
              return { ...m, content: response.userTranscription };
            }
            if (m.id === pendingAssistantId) {
              return {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.message,
                createdAt: new Date().toISOString(),
                widget: response.widget,
                actionsExecuted: response.actionsExecuted,
                isPending: false,
              };
            }
            return m;
          })
        );

        // Si la IA ejecutó acciones en la BD, refrescar las vistas de la app
        if (response.actionsExecuted && response.actionsExecuted.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['medications'] });
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        }
      } catch (err: any) {
        console.error('[useAssistant] Error:', err);
        const errMsg = err?.message || 'Hubo un error al comunicarse con Ayni.';
        setError(errMsg);

        // Remover el mensaje pendiente y agregar un mensaje de error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingAssistantId
              ? {
                  id: `assistant-err-${Date.now()}`,
                  role: 'assistant',
                  content: `Lo siento, ocurrió un problema: ${errMsg}`,
                  createdAt: new Date().toISOString(),
                  isPending: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, queryClient]
  );

  const transcribeVoice = useCallback(async (audioBase64: string, audioMimeType: string = 'audio/m4a') => {
    return assistantService.transcribeAudio(audioBase64, audioMimeType);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    transcribeVoice,
    clearMessages,
  };
}
