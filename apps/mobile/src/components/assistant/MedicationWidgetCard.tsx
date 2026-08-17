import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const MedicationWidgetCard: React.FC<Props> = ({ widget }) => {
  const { medicationName, dosage, skipped, skipReason, givenByName, givenAt } = widget.data || {};

  const timeStr = givenAt
    ? new Date(givenAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : 'Ahora';

  return (
    <View className={`mt-3 p-4 rounded-2xl border ${skipped ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2">
          <View className={`w-8 h-8 rounded-full items-center justify-center ${skipped ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Ionicons
              name={skipped ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color={skipped ? '#D97706' : '#2D6A4F'}
            />
          </View>
          <Text className={`font-semibold text-sm ${skipped ? 'text-amber-800' : 'text-emerald-800'}`}>
            {widget.title || (skipped ? 'Dosis Omitida' : 'Dosis Registrada')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 font-medium">{timeStr}</Text>
      </View>

      <Text className="text-lg font-bold text-gray-900 mb-1">
        💊 {medicationName || 'Medicamento'}
      </Text>

      {dosage && (
        <Text className="text-sm text-gray-700 mb-1">
          Dosis: <Text className="font-semibold text-gray-900">{dosage}</Text>
        </Text>
      )}

      {givenByName && (
        <Text className="text-xs text-gray-600">
          Registrado por: <Text className="font-medium text-gray-800">{givenByName}</Text>
        </Text>
      )}

      {skipped && skipReason && (
        <Text className="text-xs text-amber-700 mt-1 italic">
          Motivo: {skipReason}
        </Text>
      )}
    </View>
  );
};
