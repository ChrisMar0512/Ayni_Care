import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface Props {
  onSelectSuggestion: (text: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  { label: '💊 Ya tomó su medicina', prompt: 'Ya le di a papá su medicamento de la mañana' },
  { label: '📋 ¿Qué toca hoy?', prompt: '¿Cuál es el resumen de lo que le toca a papá hoy?' },
  { label: '💰 Registrar un gasto', prompt: 'Compré pañales y medicinas por 50 soles' },
  { label: '🩺 Agendar cita médica', prompt: 'Agenda una cita con el geriatra para el próximo martes a las 4pm' },
  { label: '🎙️ ¿Cómo va el día? / Desahogo', prompt: 'Quiero contarte cómo me siento hoy y cómo va el cuidado de mi familiar' },
  { label: '⚠️ Dificultad con mi familia', prompt: 'Tengo algunas dificultades para coordinar los gastos y el cuidado con mis hermanos' },
  { label: '📝 Nota en bitácora', prompt: 'Anota que papá durmió muy bien y amaneció de buen ánimo' },
];

export const QuickSuggestionPills: React.FC<Props> = ({ onSelectSuggestion, disabled }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUGGESTIONS.map((item, index) => (
          <TouchableOpacity
            key={index}
            disabled={disabled}
            onPress={() => onSelectSuggestion(item.prompt)}
            activeOpacity={0.7}
            style={[styles.pill, disabled && styles.pillDisabled]}
          >
            <Text style={styles.pillText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: '#F8F5F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C2C2C',
  },
});
