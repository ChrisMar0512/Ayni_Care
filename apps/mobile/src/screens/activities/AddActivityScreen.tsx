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
import { useCreateActivity } from '../../hooks/useActivities';
import { useFamilyMembers } from '../../hooks/useFamily';
import type { ActivityPriority } from '../../types/activity';
import type { ActivitiesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'AddActivity'>;

const PRIORITIES: { value: ActivityPriority; label: string; color: string; bg: string }[] = [
  { value: 'low', label: 'Baja', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'normal', label: 'Normal', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'urgent', label: 'Urgente', color: '#EF4444', bg: '#FEF2F2' },
];

function parseDateTimeToISO(ddmmyyyy: string, hhmm: string): string | null {
  const dateParts = ddmmyyyy.trim().split('/');
  if (dateParts.length !== 3) return null;
  const [day, month, year] = dateParts;
  if (!day || !month || !year || year.length !== 4) return null;

  const timeParts = hhmm.trim().split(':');
  if (timeParts.length !== 2) return null;
  const [hours, minutes] = timeParts;
  if (!hours || !minutes) return null;

  const numYear = Number(year);
  const numMonth = Number(month) - 1; // 0-indexed
  const numDay = Number(day);
  const numHours = Number(hours);
  const numMinutes = Number(minutes);

  if (
    isNaN(numYear) || isNaN(numMonth) || isNaN(numDay) ||
    isNaN(numHours) || isNaN(numMinutes) ||
    numMonth < 0 || numMonth > 11 ||
    numDay < 1 || numDay > 31 ||
    numHours < 0 || numHours > 23 ||
    numMinutes < 0 || numMinutes > 59
  ) {
    return null;
  }

  const date = new Date(numYear, numMonth, numDay, numHours, numMinutes, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function todayDDMMYYYY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

export function AddActivityScreen() {
  const navigation = useNavigation<NavProp>();
  const createActivity = useCreateActivity();
  const { data: members, isLoading: membersLoading } = useFamilyMembers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayDDMMYYYY());
  const [time, setTime] = useState('09:00');
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<ActivityPriority>('normal');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!title.trim()) next.title = 'El título es obligatorio';

    if (time.trim() && !parseDateTimeToISO(date, time)) {
      next.date = 'Fecha u hora inválida. Usa DD/MM/AAAA y HH:MM';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    // Solo incluimos scheduledAt si hay hora programada
    const scheduledAt = time.trim() ? parseDateTimeToISO(date, time)! : undefined;

    createActivity.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt,
        assignedToId: assignedToId || undefined,
        priority,
      },
      {
        onSuccess: () => {
          navigation.goBack();
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo guardar la actividad. Intenta de nuevo.');
        },
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
          <Text style={styles.headerTitle}>Nueva actividad</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Título de la tarea *" error={errors.title}>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Comprar pañales o dar medicina"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="sentences"
            />
          </Field>

          <Field label="Descripción (opcional)" error={errors.description}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles adicionales sobre la tarea..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Programar para hoy o fecha específica</Text>
            <View style={styles.dateTimeRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.dateInput,
                  errors.date && styles.inputError,
                ]}
                value={date}
                onChangeText={setDate}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.timeInput,
                  errors.date && styles.inputError,
                ]}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Prioridad</Text>
            <View style={styles.grid}>
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <Pressable
                    key={p.value}
                    style={({ pressed }) => [
                      styles.chip,
                      isSelected ? { backgroundColor: p.color, borderColor: p.color } : { backgroundColor: '#fff', borderColor: '#E5E7EB' },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setPriority(p.value)}
                    accessibilityLabel={`Prioridad: ${p.label}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? { color: '#fff', fontWeight: '700' } : { color: '#4B5563' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Asignar a</Text>
            {membersLoading ? (
              <View style={styles.membersLoading}>
                <ActivityIndicator size="small" color="#D4856A" />
                <Text style={styles.membersLoadingText}>Cargando miembros...</Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                <Pressable
                  style={({ pressed }) => [
                    styles.memberChip,
                    assignedToId === undefined && styles.memberChipSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setAssignedToId(undefined)}
                >
                  <Text
                    style={[
                      styles.memberChipText,
                      assignedToId === undefined && styles.memberChipTextSelected,
                    ]}
                  >
                    Sin asignar
                  </Text>
                </Pressable>
                {(members ?? []).map((member) => {
                  const isSelected = assignedToId === member.id;
                  return (
                    <Pressable
                      key={member.id}
                      style={({ pressed }) => [
                        styles.memberChip,
                        isSelected && styles.memberChipSelected,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setAssignedToId(member.id)}
                    >
                      <Text
                        style={[
                          styles.memberChipText,
                          isSelected && styles.memberChipTextSelected,
                        ]}
                      >
                        {member.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              createActivity.isPending && styles.submitButtonDisabled,
              pressed && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={createActivity.isPending}
            accessibilityLabel="Guardar actividad"
          >
            {createActivity.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Guardar actividad</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
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
  fieldContainer: {
    marginBottom: 18,
  },
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
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    height: 88,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  membersLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  membersLoadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberChipSelected: {
    backgroundColor: '#D4856A',
    borderColor: '#D4856A',
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  memberChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    height: 52,
    backgroundColor: '#D4856A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
