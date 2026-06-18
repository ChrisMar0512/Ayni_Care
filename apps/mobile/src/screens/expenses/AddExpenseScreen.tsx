import React, { useState, useEffect } from 'react';
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
import { useCreateExpense } from '../../hooks/useExpenses';
import { useFamilyMembers } from '../../hooks/useFamily';
import type { ExpenseCategory } from '../../types/expense';
import type { FamiliaStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'AddGasto'>;

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'medications', label: 'Medicamentos' },
  { value: 'medical', label: 'Médico' },
  { value: 'food', label: 'Alimentación' },
  { value: 'transport', label: 'Transporte' },
  { value: 'hygiene', label: 'Higiene' },
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'other', label: 'Otro' },
];

function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  return `${d}/${m}/${now.getFullYear()}`;
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

export function AddExpenseScreen() {
  const navigation = useNavigation<NavProp>();
  const createExpense = useCreateExpense();
  const { data: members, isLoading: membersLoading } = useFamilyMembers();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [date, setDate] = useState(todayDDMMYYYY());
  const [notes, setNotes] = useState('');
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill equal split when amount or member list changes
  useEffect(() => {
    if (!members || members.length === 0 || !amount) return;
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) return;

    // Only auto-fill if all splits are empty (first time entering amount)
    const hasAny = Object.values(splitAmounts).some((v) => v.trim() !== '');
    if (hasAny) return;

    const equalShare = (total / members.length).toFixed(2);
    const newSplits: Record<string, string> = {};
    members.forEach((m) => {
      newSplits[m.id] = equalShare;
    });
    setSplitAmounts(newSplits);
  }, [members, amount]);

  function updateSplit(memberId: string, value: string) {
    setSplitAmounts((prev) => ({ ...prev, [memberId]: value }));
  }

  function distributeEqually() {
    if (!members || members.length === 0) return;
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) {
      Alert.alert('Ingresa el monto total primero');
      return;
    }
    const equalShare = (total / members.length).toFixed(2);
    const newSplits: Record<string, string> = {};
    members.forEach((m) => {
      newSplits[m.id] = equalShare;
    });
    setSplitAmounts(newSplits);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!title.trim()) next.title = 'El título es obligatorio';

    const totalNum = parseFloat(amount);
    if (!amount || isNaN(totalNum) || totalNum <= 0) {
      next.amount = 'Ingresa un monto válido mayor a 0';
    }

    if (!parseDateToISO(date)) {
      next.date = 'Fecha inválida. Usa el formato DD/MM/AAAA';
    }

    if (!members || members.length === 0) {
      next.splits = 'No se pudieron cargar los miembros de la familia';
    } else {
      const splitsTotal = members.reduce((sum, m) => {
        return sum + (parseFloat(splitAmounts[m.id] ?? '0') || 0);
      }, 0);
      if (Math.abs(splitsTotal - totalNum) > 0.01) {
        next.splits = `La suma de los splits (${splitsTotal.toFixed(2)}) debe ser igual al monto total (${totalNum.toFixed(2)})`;
      }
      const hasInvalid = members.some((m) => {
        const val = parseFloat(splitAmounts[m.id] ?? '0');
        return isNaN(val) || val < 0;
      });
      if (hasInvalid) next.splits = 'Todos los montos del split deben ser números válidos';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (!members) return;

    const dateISO = parseDateToISO(date)!;
    const totalNum = parseFloat(amount);
    const splits = members.map((m) => ({
      memberId: m.id,
      amount: parseFloat(splitAmounts[m.id] ?? '0') || 0,
    }));

    createExpense.mutate(
      {
        title: title.trim(),
        amount: totalNum,
        category,
        date: dateISO,
        notes: notes.trim() || undefined,
        splits,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: () => Alert.alert('Error', 'No se pudo registrar el gasto. Intenta de nuevo.'),
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
          <Text style={styles.headerTitle}>Registrar gasto</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Descripción *" error={errors.title}>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Medicamentos de enero"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="sentences"
            />
          </Field>

          <Field label="Monto total *" error={errors.amount}>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
          </Field>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Categoría *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    category === c.value && styles.categoryChipSelected,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setCategory(c.value)}
                  accessibilityLabel={`Categoría: ${c.label}`}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === c.value && styles.categoryChipTextSelected,
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Field label="Fecha *" error={errors.date}>
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

          <Field label="Notas (opcional)" error={errors.notes}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalles adicionales del gasto..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <View style={styles.fieldContainer}>
            <View style={styles.splitsHeader}>
              <Text style={styles.fieldLabel}>División del gasto *</Text>
              <Pressable
                style={({ pressed }) => [styles.equalButton, pressed && { opacity: 0.7 }]}
                onPress={distributeEqually}
              >
                <Text style={styles.equalButtonText}>Dividir igual</Text>
              </Pressable>
            </View>

            {membersLoading ? (
              <View style={styles.membersLoading}>
                <ActivityIndicator size="small" color="#D4856A" />
                <Text style={styles.membersLoadingText}>Cargando miembros...</Text>
              </View>
            ) : (members ?? []).length === 0 ? (
              <Text style={styles.noMembersText}>No se encontraron miembros de la familia</Text>
            ) : (
              (members ?? []).map((member) => (
                <View key={member.id} style={styles.splitRow}>
                  <Text style={styles.splitMemberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <TextInput
                    style={styles.splitInput}
                    value={splitAmounts[member.id] ?? ''}
                    onChangeText={(v) => updateSplit(member.id, v)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Monto para ${member.name}`}
                  />
                </View>
              ))
            )}

            {errors.splits ? <Text style={styles.errorText}>{errors.splits}</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              createExpense.isPending && styles.submitButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={createExpense.isPending}
            accessibilityLabel="Guardar gasto"
          >
            {createExpense.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Guardar gasto</Text>
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
  textArea: { height: 88, paddingTop: 12 },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 4 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: '#D4856A',
    borderColor: '#D4856A',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  splitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  equalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FDF0EB',
    borderRadius: 8,
  },
  equalButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4856A',
  },
  membersLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  membersLoadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  noMembersText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  splitMemberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  splitInput: {
    width: 90,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#2C2C2C',
    textAlign: 'right',
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
