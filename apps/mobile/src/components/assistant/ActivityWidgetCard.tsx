import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const ActivityWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, priority, assignedTo, scheduledAt } = widget.data || {};
  const isCompleted = widget.type === 'activity_completed';

  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View className={`mt-3 p-4 rounded-2xl border ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2">
          <View className={`w-8 h-8 rounded-full items-center justify-center ${isCompleted ? 'bg-emerald-100' : 'bg-blue-100'}`}>
            <Ionicons
              name={isCompleted ? 'checkbox' : 'list-outline'}
              size={20}
              color={isCompleted ? '#2D6A4F' : '#2563EB'}
            />
          </View>
          <Text className={`font-semibold text-sm ${isCompleted ? 'text-emerald-800' : 'text-blue-800'}`}>
            {widget.title || (isCompleted ? 'Tarea Completada' : 'Tarea Creada')}
          </Text>
        </View>
        {timeStr && <Text className="text-xs text-gray-500 font-medium">{timeStr}</Text>}
      </View>

      <Text className="text-lg font-bold text-gray-900 mb-1">
        📋 {title || 'Actividad'}
      </Text>

      {assignedTo && (
        <Text className="text-xs text-gray-600">
          Asignado a: <Text className="font-semibold text-gray-800">{assignedTo}</Text>
        </Text>
      )}

      {priority && priority !== 'normal' && (
        <View className="mt-2 self-start px-2 py-0.5 rounded-full bg-red-100">
          <Text className="text-[11px] font-bold text-red-700 uppercase">
            Prioridad {priority === 'urgent' ? 'Urgente' : priority}
          </Text>
        </View>
      )}
    </View>
  );
};
