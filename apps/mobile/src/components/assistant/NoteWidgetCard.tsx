import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const NoteWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, content, authorName, createdAt } = widget.data || {};

  const timeStr = createdAt
    ? new Date(createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : 'Ahora';

  return (
    <View className="mt-3 p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center">
            <Ionicons name="document-text-outline" size={20} color="#0D9488" />
          </View>
          <Text className="font-semibold text-sm text-teal-800">
            {widget.title || 'Nota Guardada'}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 font-medium">{timeStr}</Text>
      </View>

      {title && (
        <Text className="text-base font-bold text-gray-900 mb-1">
          📝 {title}
        </Text>
      )}

      <Text className="text-sm text-gray-800 bg-white/60 p-2.5 rounded-xl border border-teal-100 mb-2">
        "{content}"
      </Text>

      {authorName && (
        <Text className="text-xs text-gray-500">
          Escrita por: <Text className="font-medium text-gray-700">{authorName}</Text>
        </Text>
      )}
    </View>
  );
};
