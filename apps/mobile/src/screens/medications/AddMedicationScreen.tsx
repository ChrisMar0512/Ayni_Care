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
import { useCreateMedication, useUpdateMedication } from '../../hooks/useMedications';
import type { MedicationsStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<MedicationsStackParamList, 'AddMedication'>;
type RoutePropType = RouteProp<MedicationsStackParamList, 'AddMedication'>;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function formatISOToDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return todayDDMMYYYY();
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
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

export function AddMedicationScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const medication = route.params?.medication;
  const isEditing = !!medication;

  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();
  const isPending = createMedication.isPending || updateMedication.isPending;

  const [name, setName] = useState(medication?.name ?? '');
  const [dosage, setDosage] = useState(medication?.dosage ?? '');
  const [form, setForm] = useState(medication?.form ?? '');
  const [frequency, setFrequency] = useState(medication?.frequency ?? '');
  const [times, setTimes] = useState<string[]>(medication?.times ?? ['']);
  const [instructions, setInstructions] = useState(medication?.instructions ?? '');
  const [startDate, setStartDate] = useState(
    medication ? formatISOToDDMMYYYY(medication.startDate) : todayDDMMYYYY()
  );
  const [stock, setStock] = useState(
    medication?.stock !== undefined && medication.stock !== null ? String(medication.stock) : ''
  );
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

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = 'El nombre es obligatorio';
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

  async function handleSubmit() {
    if (!validate()) return;

    const startDateISO = parseDateToISO(startDate)!;
    const payload = {
      name: name.trim(),
      dosage: dosage.trim(),
      form: form.trim() || null,
      frequency: frequency.trim(),
      times: times.map((t) => t.trim()),
      instructions: instructions.trim() || null,
      startDate: startDateISO,
      stock: stock ? Number(stock) : null,
    };

    if (isEditing && medication) {
      updateMedication.mutate(
        {
          id: medication.id,
          input: payload,
        },
        {
          onSuccess: () => {
            navigation.goBack();
          },
          onError: () => {
            Alert.alert('Error', 'No se pudo actualizar el medicamento. Intenta de nuevo.');
          },
        }
      );
    } else {
      createMedication.mutate(
        {
          ...payload,
          form: form.trim() || undefined,
          instructions: instructions.trim() || undefined,
          stock: stock ? Number(stock) : undefined,
        },
        {
          onSuccess: () => {
            navigation.goBack();
          },
          onError: () => {
            Alert.alert('Error', 'No se pudo guardar el medicamento. Intenta de nuevo.');
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
            {isEditing ? 'Editar medicamento' : 'Agregar medicamento'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Nombre del medicamento *" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Metformina"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </Field>

          <Field label="Dosis *" error={errors.dosage}>
            <TextInput
              style={[styles.input, errors.dosage && styles.inputError]}
              value={dosage}
              onChangeText={setDosage}
              placeholder="Ej. 500mg"
              placeholderTextColor="#9CA3AF"
            />
          </Field>

          <Field label="Forma farmacéutica" error={errors.form}>
            <TextInput
              style={styles.input}
              value={form}
              onChangeText={setForm}
              placeholder="Ej. Pastilla, Jarabe, Inyección"
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
              {['Diario', 'Interdiario', 'Cada 8 horas', 'Cada 12 horas', 'Lunes, Miércoles, Viernes'].map((s) => (
                <Pressable
                  key={s}
                  style={{
                    backgroundColor: frequency === s ? '#D4856A' : '#fff',
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
            <Text style={styles.fieldLabel}>Horarios * (HH:MM)</Text>
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
                    accessibilityLabel="Eliminar horario"
                    hitSlop={8}
                  >
                    <Ionicons name="remove-circle" size={24} color="#E57373" />
                  </Pressable>
                )}
              </View>
            ))}
            {errors.times ? (
              <Text style={styles.errorText}>{errors.times}</Text>
            ) : null}
            <Pressable style={styles.addTimeButton} onPress={addTime}>
              <Ionicons name="add-circle-outline" size={18} color="#D4856A" />
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

          <Field label="Stock actual (unidades)" error={errors.stock}>
            <TextInput
              style={[styles.input, errors.stock && styles.inputError]}
              value={stock}
              onChangeText={setStock}
              placeholder="Ej. 30"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Instrucciones adicionales" error={errors.instructions}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Ej. Tomar con alimentos, evitar alcohol..."
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
            accessibilityLabel="Guardar medicamento"
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Guardar cambios' : 'Guardar medicamento'}
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
    gap: 4,
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
    color: '#D4856A',
    fontWeight: '500',
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
