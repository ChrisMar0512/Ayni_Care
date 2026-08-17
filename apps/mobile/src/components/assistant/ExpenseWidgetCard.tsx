import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const ExpenseWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, amount, currency = 'PEN', paidBy, splits = [] } = widget.data || {};

  return (
    <View className="mt-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
            <Ionicons name="wallet-outline" size={20} color="#D97706" />
          </View>
          <Text className="font-semibold text-sm text-amber-800">
            {widget.title || 'Gasto Compartido Registrado'}
          </Text>
        </View>
        <Text className="text-base font-bold text-amber-900">
          {currency === 'PEN' ? 'S/.' : '$'} {Number(amount || 0).toFixed(2)}
        </Text>
      </View>

      <Text className="text-lg font-bold text-gray-900 mb-1">
        🛒 {title || 'Gasto de cuidado'}
      </Text>

      {paidBy && (
        <Text className="text-xs text-gray-600 mb-2">
          Pagado por: <Text className="font-semibold text-gray-800">{paidBy}</Text>
        </Text>
      )}

      {splits.length > 0 && (
        <View className="mt-2 pt-2 border-t border-amber-200/80">
          <Text className="text-xs font-semibold text-amber-900 mb-1">
            División entre familiares:
          </Text>
          {splits.map((s: any, idx: number) => (
            <View key={idx} className="flex-row items-center justify-between py-0.5">
              <Text className="text-xs text-gray-700 font-medium">• {s.name}</Text>
              <Text className="text-xs font-semibold text-gray-900">
                {currency === 'PEN' ? 'S/.' : '$'} {Number(s.amount).toFixed(2)}{' '}
                <Text className={s.isPaid ? 'text-emerald-600 font-bold' : 'text-amber-600 font-normal'}>
                  ({s.isPaid ? 'Cubierto' : 'Pendiente'})
                </Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
