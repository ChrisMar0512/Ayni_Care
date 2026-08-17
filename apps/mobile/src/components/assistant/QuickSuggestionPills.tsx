import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  onSelectSuggestion: (text: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  { label: '💊 Ya tomó su medicina', prompt: 'Ya le di a papá su medicamento de la mañana' },
  { label: '📋 ¿Qué toca hoy?', prompt: '¿Cuál es el resumen de lo que le toca a papá hoy?' },
  { label: '💰 Registrar un gasto', prompt: 'Compré pañales y medicinas por 50 soles' },
  { label: '📝 Nota del día', prompt: 'Anota que papá durmió muy bien y amaneció de buen ánimo' },
  { label: '🩺 Agendar cita médica', prompt: 'Agenda una cita con el geriatra para el próximo martes a las 4pm' },
];

export const QuickSuggestionPills: React.FC<Props> = ({ onSelectSuggestion, disabled }) => {
  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {SUGGESTIONS.map((item, index) => (
          <TouchableOpacity
            key={index}
            disabled={disabled}
            onPress={() => onSelectSuggestion(item.prompt)}
            activeOpacity={0.7}
            className={`mr-2.5 px-3.5 py-2 rounded-full border border-emerald-300 bg-emerald-50/90 shadow-sm ${
              disabled ? 'opacity-50' : 'active:bg-emerald-100'
            }`}
          >
            <Text className="text-xs font-semibold text-emerald-900">
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
