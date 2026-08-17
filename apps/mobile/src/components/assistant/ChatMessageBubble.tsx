import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantChatMessage } from '../../types/assistant';
import { MedicationWidgetCard } from './MedicationWidgetCard';
import { ActivityWidgetCard } from './ActivityWidgetCard';
import { ExpenseWidgetCard } from './ExpenseWidgetCard';
import { AppointmentWidgetCard } from './AppointmentWidgetCard';
import { NoteWidgetCard } from './NoteWidgetCard';
import { DailySummaryWidgetCard } from './DailySummaryWidgetCard';

interface Props {
  message: AssistantChatMessage;
}

export const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  const renderWidget = () => {
    if (!message.widget) return null;

    switch (message.widget.type) {
      case 'medication_dose_logged':
        return <MedicationWidgetCard widget={message.widget} />;
      case 'activity_created':
      case 'activity_completed':
        return <ActivityWidgetCard widget={message.widget} />;
      case 'expense_created':
        return <ExpenseWidgetCard widget={message.widget} />;
      case 'appointment_created':
        return <AppointmentWidgetCard widget={message.widget} />;
      case 'note_created':
        return <NoteWidgetCard widget={message.widget} />;
      case 'daily_summary':
        return <DailySummaryWidgetCard widget={message.widget} />;
      default:
        return null;
    }
  };

  const timeStr = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (isUser) {
    return (
      <View className="flex-row justify-end my-1.5 px-4">
        <View className="max-w-[82%] bg-[#2D6A4F] rounded-3xl rounded-tr-sm px-4 py-3 shadow-sm">
          <Text className="text-white text-base font-normal leading-relaxed">
            {message.content}
          </Text>
          {timeStr && (
            <Text className="text-[11px] text-emerald-200 self-end mt-1 font-light">
              {timeStr}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row justify-start my-2 px-4 space-x-2">
      {/* Avatar de Ayni */}
      <View className="w-8 h-8 rounded-full bg-[#2D6A4F] items-center justify-center mt-1 shadow-xs">
        <Ionicons name="leaf" size={16} color="#FFFFFF" />
      </View>

      <View className="max-w-[82%]">
        <View className="bg-white rounded-3xl rounded-tl-sm px-4 py-3.5 border border-gray-100 shadow-xs">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs font-bold text-[#2D6A4F]">Ayni</Text>
            {timeStr && !message.isPending && (
              <Text className="text-[10px] text-gray-400 font-light">{timeStr}</Text>
            )}
          </View>

          {message.isPending ? (
            <View className="flex-row items-center space-x-2 py-1">
              <ActivityIndicator size="small" color="#2D6A4F" />
              <Text className="text-sm text-gray-500 italic">Escribiendo y coordinando...</Text>
            </View>
          ) : (
            <Text className="text-gray-900 text-base leading-relaxed">
              {message.content}
            </Text>
          )}

          {/* Renderizado de Widgets / Componentes Vivos */}
          {renderWidget()}
        </View>
      </View>
    </View>
  );
};
