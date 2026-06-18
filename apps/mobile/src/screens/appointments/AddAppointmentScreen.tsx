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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCreateAppointment, useUpdateAppointment } from '../../hooks/useAppointments';
import type { AppointmentType } from '../../types/appointment';
import type { AppointmentsStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<AppointmentsStackParamList, 'AddAppointment'>;
type RoutePropType = RouteProp<AppointmentsStackParamList, 'AddAppointment'>;

function formatLocalToDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return todayDDMMYYYY();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatLocalToHHMM(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '09:00';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'medical', label: 'Médica' },
  { value: 'therapy', label: 'Terapia' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'pharmacy', label: 'Farmacia' },
  { value: 'other', label: 'Otra' },
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

export function AddAppointmentScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const appointment = route.params?.appointment;
  const isEditing = !!appointment;

  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const isPending = createAppointment.isPending || updateAppointment.isPending;

  const [title, setTitle] = useState(appointment?.title ?? '');
  const [type, setType] = useState<AppointmentType>(appointment?.type ?? 'medical');
  const [date, setDate] = useState(appointment ? formatLocalToDDMMYYYY(appointment.scheduledAt) : todayDDMMYYYY());
  const [time, setTime] = useState(appointment ? formatLocalToHHMM(appointment.scheduledAt) : '09:00');
  const [location, setLocation] = useState(appointment?.location ?? '');
  const [doctorName, setDoctorName] = useState(appointment?.doctorName ?? '');
  const [durationMin, setDurationMin] = useState(appointment?.durationMin ? String(appointment.durationMin) : '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!title.trim()) next.title = 'El título es obligatorio';

    if (!parseDateTimeToISO(date, time)) {
      next.date = 'Fecha u hora inválida. Usa DD/MM/AAAA y HH:MM';
    }

    if (durationMin && (isNaN(Number(durationMin)) || Number(durationMin) <= 0)) {
      next.durationMin = 'La duración debe ser un número positivo';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const scheduledAt = parseDateTimeToISO(date, time)!;
    const payload = {
      title: title.trim(),
      type,
      scheduledAt,
      location: location.trim() || null,
      doctorName: doctorName.trim() || null,
      durationMin: durationMin ? Number(durationMin) : null,
      notes: notes.trim() || null,
    };

    if (isEditing && appointment) {
      updateAppointment.mutate(
        {
          id: appointment.id,
          input: payload,
        },
        {
          onSuccess: () => {
            navigation.goBack();
          },
          onError: () => {
            Alert.alert('Error', 'No se pudo actualizar la cita. Intenta de nuevo.');
          },
        }
      );
    } else {
      createAppointment.mutate(
        {
          ...payload,
          location: location.trim() || undefined,
          doctorName: doctorName.trim() || undefined,
          durationMin: durationMin ? Number(durationMin) : undefined,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: () => {
            navigation.goBack();
          },
          onError: () => {
            Alert.alert('Error', 'No se pudo agendar la cita. Intenta de nuevo.');
          },
        }
      );
    }
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
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar cita' : 'Agendar cita'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Título *" error={errors.title}>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Consulta con Dr. García"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="sentences"
            />
          </Field>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Tipo de cita *</Text>
            <View style={styles.typeGrid}>
              {APPOINTMENT_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={({ pressed }) => [
                    styles.typeChip,
                    type === t.value && styles.typeChipSelected,
                    pressed && styles.typeChipPressed,
                  ]}
                  onPress={() => setType(t.value)}
                  accessibilityLabel={`Tipo: ${t.label}`}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === t.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Fecha y hora *</Text>
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

          <Field label="Lugar / Dirección" error={errors.location}>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Ej. Hospital General, Sala 3"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </Field>

          <Field label="Médico / Especialista" error={errors.doctorName}>
            <TextInput
              style={styles.input}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholder="Ej. Dra. Martínez"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </Field>

          <Field label="Duración estimada (minutos)" error={errors.durationMin}>
            <TextInput
              style={[styles.input, errors.durationMin && styles.inputError]}
              value={durationMin}
              onChangeText={setDurationMin}
              placeholder="Ej. 30"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Notas" error={errors.notes}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Lleva los estudios previos, lista de medicamentos..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              isPending && styles.submitButtonDisabled,
              pressed && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={isPending}
            accessibilityLabel="Guardar cita"
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Guardar cambios' : 'Guardar cita'}
              </Text>
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
    marginBottom: 16,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipSelected: {
    backgroundColor: '#D4856A',
    borderColor: '#D4856A',
  },
  typeChipPressed: {
    opacity: 0.75,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  typeChipTextSelected: {
    color: '#fff',
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
  submitButton: {
    height: 52,
    backgroundColor: '#D4856A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
