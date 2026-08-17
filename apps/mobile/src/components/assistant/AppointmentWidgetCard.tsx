import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const AppointmentWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, doctorName, location, scheduledAt } = widget.data || {};

  const formattedDate = scheduledAt
    ? new Date(scheduledAt).toLocaleString('es-PE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Fecha por definir';

  return (
    <View className="mt-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
            <Ionicons name="calendar" size={20} color="#4F46E5" />
          </View>
          <Text className="font-semibold text-sm text-indigo-800">
            {widget.title || 'Cita Agendada en Calendario'}
          </Text>
        </View>
      </View>

      <Text className="text-lg font-bold text-gray-900 mb-1">
        🩺 {title || 'Cita Médica'}
      </Text>

      <View className="mt-2 space-y-1">
        <View className="flex-row items-center space-x-1.5">
          <Ionicons name="time-outline" size={16} color="#4B5563" />
          <Text className="text-sm font-semibold text-gray-800">{formattedDate}</Text>
        </View>

        {doctorName && (
          <View className="flex-row items-center space-x-1.5 mt-1">
            <Ionicons name="person-outline" size={16} color="#4B5563" />
            <Text className="text-xs text-gray-700">
              Especialista: <Text className="font-medium text-gray-900">{doctorName}</Text>
            </Text>
          </View>
        )}

        {location && (
          <View className="flex-row items-center space-x-1.5 mt-1">
            <Ionicons name="location-outline" size={16} color="#4B5563" />
            <Text className="text-xs text-gray-700">{location}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
