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
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCreateActivity } from '../../hooks/useActivities';
import { useCreateMedication } from '../../hooks/useMedications';
import { useFamilyMembers } from '../../hooks/useFamily';
import type { ActivityPriority } from '../../types/activity';
import type { ActivitiesStackParamList } from '../../navigation/types';
import { AiAutocompleteBox } from '../../components/forms/AiAutocompleteBox';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'AddActivity'>;

const PRIORITIES: { value: ActivityPriority; label: string; color: string; bg: string }[] = [
  { value: 'low', label: 'Baja', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'normal', label: 'Normal', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'urgent', label: 'Urgente', color: '#EF4444', bg: '#FEF2F2' },
];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
  const numMonth = Number(month) - 1;
  const numDay = Number(day);
  const numHours = Number(hours);
  const numMinutes = Number(minutes);

  const date = new Date(numYear, numMonth, numDay, numHours, numMinutes, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseDateToISO(ddmmyyyy: string): string | null {
  const parts = ddmmyyyy.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
  const date = new Date(iso);
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

  // Selector unificado: por defecto en 'activity'
  const [itemType, setItemType] = useState<'activity' | 'medication'>('activity');

  // Hooks de datos
  const createActivity = useCreateActivity();
  const createMedication = useCreateMedication();
  const { data: members } = useFamilyMembers();

  const isPending = createActivity.isPending || createMedication.isPending;

  // Estado Formulario Actividad
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayDDMMYYYY());
  const [time, setTime] = useState('09:00');
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<ActivityPriority>('normal');

  // Estado Formulario Medicamento
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('');
  const [frequency, setFrequency] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(todayDDMMYYYY());
  const [stock, setStock] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  function addTime() {
    setTimes((prev) => [...prev, '']);
  }

  function removeTime(index: number) {
    if (times.length === 1) return;
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  // Autocompletado con IA
  const handleAiParsed = (parsed: Record<string, any>) => {
    if (itemType === 'activity') {
      if (parsed.title) setTitle(parsed.title);
      if (parsed.notes) setDescription(parsed.notes);
      if (parsed.scheduledTime) setTime(parsed.scheduledTime);
      if (parsed.priority && ['low', 'normal', 'urgent'].includes(parsed.priority)) {
        setPriority(parsed.priority as ActivityPriority);
      }
    } else {
      if (parsed.name) setMedName(parsed.name);
      if (parsed.dosage) setDosage(parsed.dosage);
      if (parsed.form) setForm(parsed.form);
      if (parsed.frequency) setFrequency(parsed.frequency);
      if (Array.isArray(parsed.times) && parsed.times.length > 0) {
        setTimes(parsed.times);
      }
      if (parsed.instructions) setInstructions(parsed.instructions);
      if (parsed.stock !== undefined && parsed.stock !== null) {
        setStock(String(parsed.stock));
      }
    }
  };

  function validateActivity(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'El título de la actividad es obligatorio';
    if (time.trim() && !parseDateTimeToISO(date, time)) {
      next.date = 'Fecha u hora inválida. Usa DD/MM/AAAA y HH:MM';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateMedication(): boolean {
    const next: Record<string, string> = {};
    if (!medName.trim()) next.medName = 'El nombre es obligatorio';
    if (!dosage.trim()) next.dosage = 'La dosis es obligatoria';
    if (!frequency.trim()) next.frequency = 'La frecuencia es obligatoria';

    const invalidTimes = times.some((t) => !TIME_REGEX.test(t.trim()));
    if (times.length === 0 || invalidTimes) {
      next.times = 'Ingresa los horarios en formato HH:MM (ej. 08:00)';
    }

    if (!parseDateToISO(startDate)) {
      next.startDate = 'Fecha inválida. Usa DD/MM/AAAA';
    }

    if (stock && (isNaN(Number(stock)) || Number(stock) < 0)) {
      next.stock = 'El stock debe ser un número positivo';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleActivitySubmit() {
    if (!validateActivity()) return;

    const scheduledAt = parseDateTimeToISO(date, time.trim() || '09:00') ?? undefined;

    createActivity.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt,
        assignedToId,
        priority,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: () => Alert.alert('Error', 'No se pudo guardar la actividad.'),
      }
    );
  }

  async function handleMedicationSubmit() {
    if (!validateMedication()) return;

    const startDateISO = parseDateToISO(startDate)!;
    createMedication.mutate(
      {
        name: medName.trim(),
        dosage: dosage.trim(),
        form: form.trim() || undefined,
        frequency: frequency.trim(),
        times: times.map((t) => t.trim()),
        instructions: instructions.trim() || undefined,
        startDate: startDateISO,
        stock: stock ? Number(stock) : undefined,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: () => Alert.alert('Error', 'No se pudo guardar el medicamento.'),
      }
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Volver"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color="#1A2B1A" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {itemType === 'activity' ? 'Nueva actividad' : 'Agregar medicamento'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Selector Unificado */}
          <View style={styles.switcherContainer}>
            <Pressable
              style={[styles.switcherBtn, itemType === 'activity' && styles.switcherBtnActive]}
              onPress={() => {
                setItemType('activity');
                setErrors({});
              }}
            >
              <Ionicons
                name="checkbox"
                size={18}
                color={itemType === 'activity' ? '#FFFFFF' : '#2D6A4F'}
              />
              <Text
                style={[
                  styles.switcherBtnText,
                  itemType === 'activity' && styles.switcherBtnTextActive,
                ]}
              >
                Actividad / Tarea
              </Text>
            </Pressable>

            <Pressable
              style={[styles.switcherBtn, itemType === 'medication' && styles.switcherBtnActive]}
              onPress={() => {
                setItemType('medication');
                setErrors({});
              }}
            >
              <Ionicons
                name="medical"
                size={18}
                color={itemType === 'medication' ? '#FFFFFF' : '#2D6A4F'}
              />
              <Text
                style={[
                  styles.switcherBtnText,
                  itemType === 'medication' && styles.switcherBtnTextActive,
                ]}
              >
                Medicamento
              </Text>
            </Pressable>
          </View>

          {/* Autocompletar con IA */}
          <AiAutocompleteBox type={itemType} onParsed={handleAiParsed} />

          {/* ─── FORMULARIO ACTIVIDAD ─── */}
          {itemType === 'activity' ? (
            <>
              <Field label="Título de la tarea o cuidado *" error={errors.title}>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ej. Baño asistido o Caminata en el parque"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="sentences"
                />
              </Field>

              <Field label="Detalles o descripción" error={errors.description}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ej. Usar silla de baño y agua tibia..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </Field>

              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Field label="Fecha (DD/MM/AAAA)" error={errors.date}>
                    <TextInput
                      style={[styles.input, errors.date && styles.inputError]}
                      value={date}
                      onChangeText={setDate}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                    />
                  </Field>
                </View>

                <View style={{ flex: 1 }}>
                  <Field label="Hora (HH:MM)">
                    <TextInput
                      style={styles.input}
                      value={time}
                      onChangeText={setTime}
                      placeholder="09:00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </Field>
                </View>
              </View>

              {/* Botones rápidos de horario */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {['08:00', '10:00', '13:00', '16:00', '20:00'].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.timeChip, time === h && styles.timeChipActive]}
                    onPress={() => setTime(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeChipText, time === h && styles.timeChipTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Prioridad */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Prioridad</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.value;
                    return (
                      <Pressable
                        key={p.value}
                        style={[
                          styles.priorityButton,
                          { borderColor: isSelected ? p.color : '#E5E7EB' },
                          isSelected && { backgroundColor: p.bg },
                        ]}
                        onPress={() => setPriority(p.value)}
                      >
                        <Text
                          style={[
                            styles.priorityButtonText,
                            { color: isSelected ? p.color : '#6B7280' },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Asignar a familiar */}
              {members && members.length > 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Asignar a un cuidador o familiar</Text>
                  <View style={styles.membersRow}>
                    <Pressable
                      style={[
                        styles.memberChip,
                        assignedToId === undefined && styles.memberChipSelected,
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

                    {members.map((m) => {
                      const isSelected = assignedToId === m.id;
                      return (
                        <Pressable
                          key={m.id}
                          style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                          onPress={() => setAssignedToId(m.id)}
                        >
                          <Text
                            style={[
                              styles.memberChipText,
                              isSelected && styles.memberChipTextSelected,
                            ]}
                          >
                            {m.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  isPending && styles.submitButtonDisabled,
                  pressed && styles.submitButtonPressed,
                ]}
                onPress={handleActivitySubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar actividad</Text>
                )}
              </Pressable>
            </>
          ) : (
            /* ─── FORMULARIO MEDICAMENTO ─── */
            <>
              <Field label="Nombre del medicamento *" error={errors.medName}>
                <TextInput
                  style={[styles.input, errors.medName && styles.inputError]}
                  value={medName}
                  onChangeText={setMedName}
                  placeholder="Ej. Metformina o Losartán"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </Field>

              <Field label="Dosis *" error={errors.dosage}>
                <TextInput
                  style={[styles.input, errors.dosage && styles.inputError]}
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="Ej. 500mg o 1 tableta"
                  placeholderTextColor="#9CA3AF"
                />
              </Field>

              <Field label="Forma farmacéutica" error={errors.form}>
                <TextInput
                  style={styles.input}
                  value={form}
                  onChangeText={setForm}
                  placeholder="Ej. Pastilla, Cápsula, Jarabe"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </Field>

              <Field label="Frecuencia *" error={errors.frequency}>
                <TextInput
                  style={[styles.input, errors.frequency && styles.inputError]}
                  value={frequency}
                  onChangeText={setFrequency}
                  placeholder="Ej. Cada 8 horas, Diario"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {['Diario', 'Cada 8 horas', 'Cada 12 horas', 'Interdiario'].map((s) => (
                    <Pressable
                      key={s}
                      style={{
                        backgroundColor: frequency === s ? '#2D6A4F' : '#fff',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                      onPress={() => setFrequency(s)}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: frequency === s ? '#fff' : '#374151',
                          fontWeight: '500',
                        }}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Horarios de toma * (HH:MM)</Text>
                {times.map((t, i) => (
                  <View key={i} style={styles.timeRow}>
                    <TextInput
                      style={[styles.input, styles.timeInput, errors.times && styles.inputError]}
                      value={t}
                      onChangeText={(v) => updateTime(i, v)}
                      placeholder="08:00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    {times.length > 1 && (
                      <Pressable
                        style={styles.removeTimeButton}
                        onPress={() => removeTime(i)}
                        hitSlop={8}
                      >
                        <Ionicons name="remove-circle" size={24} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                ))}
                {errors.times ? <Text style={styles.errorText}>{errors.times}</Text> : null}
                <Pressable style={styles.addTimeButton} onPress={addTime}>
                  <Ionicons name="add-circle-outline" size={18} color="#2D6A4F" />
                  <Text style={styles.addTimeText}>Agregar otro horario</Text>
                </Pressable>
              </View>

              <Field label="Fecha de inicio * (DD/MM/AAAA)" error={errors.startDate}>
                <TextInput
                  style={[styles.input, errors.startDate && styles.inputError]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </Field>

              <Field label="Stock actual en casa (unidades)" error={errors.stock}>
                <TextInput
                  style={[styles.input, errors.stock && styles.inputError]}
                  value={stock}
                  onChangeText={setStock}
                  placeholder="Ej. 30 pastillas"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </Field>

              <Field label="Instrucciones adicionales" error={errors.instructions}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="Ej. Tomar después del desayuno con abundante agua..."
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
                onPress={handleMedicationSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar medicamento</Text>
                )}
              </Pressable>
            </>
          )}
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
    backgroundColor: '#F8FAF8',
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
    color: '#1A2B1A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#E6EFEA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  switcherBtnActive: {
    backgroundColor: '#2D6A4F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  switcherBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D6A4F',
  },
  switcherBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    color: '#1A2B1A',
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeChipActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  timeChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  memberChipSelected: {
    borderColor: '#2D6A4F',
    backgroundColor: '#E8F5E9',
  },
  memberChipText: {
    fontSize: 14,
    color: '#374151',
  },
  memberChipTextSelected: {
    color: '#2D6A4F',
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
  },
  removeTimeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  addTimeText: {
    fontSize: 15,
    color: '#2D6A4F',
    fontWeight: '600',
  },
  submitButton: {
    height: 52,
    backgroundColor: '#2D6A4F',
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
