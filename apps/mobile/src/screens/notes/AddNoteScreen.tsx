import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCreateNote } from '../../hooks/useNotes';
import type { NoteType } from '../../types/note';
import type { FamiliaStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'AddNota'>;

const NOTE_TYPES: { value: NoteType; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'Nota sin categoría específica' },
  { value: 'medical', label: 'Médica', description: 'Información médica importante' },
  { value: 'handoff', label: 'Entrega de turno', description: 'Resumen para el siguiente cuidador' },
  { value: 'symptom', label: 'Síntoma', description: 'Síntoma nuevo o cambio observado' },
  { value: 'observation', label: 'Observación', description: 'Comportamiento, ánimo o estado general' },
];

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function AddNoteScreen() {
  const navigation = useNavigation<NavProp>();
  const createNote = useCreateNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('general');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!content.trim()) next.content = 'El contenido de la nota es obligatorio';
    if (content.trim().length > 5000) next.content = 'Máximo 5000 caracteres';
    if (title.trim().length > 200) next.title = 'El título no puede superar los 200 caracteres';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    createNote.mutate(
      {
        title: title.trim() || undefined,
        content: content.trim(),
        type,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: () => Alert.alert('Error', 'No se pudo guardar la nota. Intenta de nuevo.'),
      },
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Volver"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color="#2C2C2C" />
          </Pressable>
          <Text style={styles.headerTitle}>Nueva nota</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Tipo de nota *</Text>
            <View style={styles.typeList}>
              {NOTE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={({ pressed }) => [
                    styles.typeOption,
                    type === t.value && styles.typeOptionSelected,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setType(t.value)}
                  accessibilityLabel={`Tipo: ${t.label}`}
                >
                  <View style={styles.typeOptionLeft}>
                    <Text
                      style={[
                        styles.typeOptionLabel,
                        type === t.value && styles.typeOptionLabelSelected,
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.typeOptionDesc}>{t.description}</Text>
                  </View>
                  {type === t.value && (
                    <Ionicons name="checkmark-circle" size={22} color="#D4856A" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <Field label="Título (opcional)" error={errors.title}>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Visita del médico — 10 de junio"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="sentences"
              maxLength={200}
            />
          </Field>

          <Field label="Contenido *" error={errors.content}>
            <TextInput
              style={[styles.input, styles.textArea, errors.content && styles.inputError]}
              value={content}
              onChangeText={setContent}
              placeholder="Escribe aquí las observaciones, instrucciones o el resumen del turno..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoCapitalize="sentences"
              maxLength={5000}
            />
            <Text style={styles.charCount}>{content.length}/5000</Text>
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              createNote.isPending && styles.submitButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={createNote.isPending}
            accessibilityLabel="Guardar nota"
          >
            {createNote.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Guardar nota</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#2C2C2C',
  },
  inputError: { borderColor: '#EF4444' },
  textArea: {
    height: 140,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 4 },
  typeList: { gap: 8 },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
  },
  typeOptionSelected: {
    borderColor: '#D4856A',
    backgroundColor: '#FDF9F7',
  },
  typeOptionLeft: {
    flex: 1,
    gap: 2,
  },
  typeOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  typeOptionLabelSelected: {
    color: '#D4856A',
  },
  typeOptionDesc: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  submitButton: {
    height: 52,
    backgroundColor: '#D4856A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
