import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Props {
  type: 'medication' | 'activity';
  onParsed: (data: Record<string, any>) => void;
}

export const AiAutocompleteBox: React.FC<Props> = ({ type, onParsed }) => {
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMed = type === 'medication';

  const placeholderText = isMed
    ? 'Pega la receta o escribe (ej. "Losartán 50mg cada 12 horas a las 8am y 8pm con comida, tenemos 30 pastillas")...'
    : 'Escribe la tarea o indicación (ej. "Bañar y aseo personal a las 10:00 am, urgente antes del almuerzo")...';

  const suggestions = isMed
    ? ['Losartán 50mg cada 12h (8:00 y 20:00)', 'Paracetamol 500mg cada 8h']
    : ['Baño asistido a las 10:00 am', 'Caminar 20 min a las 16:30'];

  const handleAutocomplete = async () => {
    if (!promptText.trim()) {
      setErrorMsg('Escribe o pega alguna instrucción primero para autocompletar.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await api.post<{ success: boolean; data: Record<string, any> }>(
        '/api/assistant/parse-form',
        {
          type,
          text: promptText.trim(),
        }
      );

      if (response.data?.success && response.data?.data) {
        onParsed(response.data.data);
        setSuccessMsg('✨ ¡Campos autocompletados con IA! Puedes revisarlos o editarlos abajo.');
      } else {
        setErrorMsg('No se pudieron extraer datos del texto. Intenta ser más específico.');
      }
    } catch (err: any) {
      console.error('[AiAutocompleteBox] Error:', err);
      const msg = err.response?.data?.error || 'No se pudo conectar con el servicio de IA.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.sparkleIcon}>
            <Ionicons name="sparkles" size={16} color="#2D6A4F" />
          </View>
          <Text style={styles.title}>Autocompletar con IA</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Asistente</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        {isMed
          ? 'Pega la receta médica o escribe las indicaciones y la IA llenará los campos automáticamente:'
          : 'Escribe la tarea en tus propias palabras y la IA configurará los horarios y prioridad:'}
      </Text>

      {/* Input */}
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={3}
        placeholder={placeholderText}
        placeholderTextColor="#9CA3AF"
        value={promptText}
        onChangeText={(text) => {
          setPromptText(text);
          if (errorMsg) setErrorMsg(null);
          if (successMsg) setSuccessMsg(null);
        }}
      />

      {/* Suggestions */}
      <View style={styles.suggestionsContainer}>
        {suggestions.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.chip}
            onPress={() => setPromptText(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>Ej: {s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error / Success Feedback */}
      {errorMsg ? (
        <View style={styles.feedbackError}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.feedbackErrorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {successMsg ? (
        <View style={styles.feedbackSuccess}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.feedbackSuccessText}>{successMsg}</Text>
        </View>
      ) : null}

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleAutocomplete}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {isMed ? 'Completar Medicamento con IA' : 'Completar Actividad con IA'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  badge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  subtitle: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1A2B1A',
    minHeight: 65,
    textAlignVertical: 'top',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  chip: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C6E7D0',
  },
  chipText: {
    fontSize: 12,
    color: '#1E4620',
    fontWeight: '500',
  },
  feedbackError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  feedbackErrorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  feedbackSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  feedbackSuccessText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  button: {
    backgroundColor: '#2D6A4F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    minHeight: 48,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
