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
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInviteMember } from '../../hooks/useFamily';
import type { MemberRole } from '@ayni-care/shared';
import type { FamiliaStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'InvitarMiembro'>;

const ROLES: { value: MemberRole; label: string; desc: string; icon: string; color: string }[] = [
  {
    value: 'primary_caregiver',
    label: 'Cuidador Principal',
    desc: 'Administra todo (citas, tareas, finanzas) y tiene control total.',
    icon: 'ribbon-outline',
    color: '#D4856A',
  },
  {
    value: 'remote_family',
    label: 'Familiar Remoto',
    desc: 'Familiares que ayudan a distancia y se mantienen informados.',
    icon: 'people-outline',
    color: '#87A96B',
  },
  {
    value: 'weekend_helper',
    label: 'Ayudante de Fin de Semana',
    desc: 'Apoya en turnos específicos de descanso o fines de semana.',
    icon: 'calendar-outline',
    color: '#3B82F6',
  },
  {
    value: 'paid_caregiver',
    label: 'Cuidador Contratado',
    desc: 'Personal pagado que registra bitácoras diarias de cuidado.',
    icon: 'briefcase-outline',
    color: '#8B5CF6',
  },
];

export function InviteMemberScreen() {
  const navigation = useNavigation<NavProp>();
  const inviteMember = useInviteMember();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<MemberRole>('remote_family');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successToken, setSuccessToken] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!email.trim() && !phone.trim()) {
      next.contact = 'Debes ingresar al menos un correo o un teléfono';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        next.email = 'El formato de correo es inválido';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    inviteMember.mutate(
      {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      },
      {
        onSuccess: (data) => {
          setSuccessToken(data.token);
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo crear la invitación. Intenta de nuevo.');
        },
      }
    );
  }

  function handleCopy() {
    if (successToken) {
      Clipboard.setString(successToken);
      Alert.alert('Copiado', 'El código de invitación se copió al portapapeles.');
    }
  }

  if (successToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#87A96B" />
            </View>
            <Text style={styles.successTitle}>¡Invitación Generada!</Text>
            <Text style={styles.successSub}>
              Copia el código a continuación y envíaselo a tu familiar (por WhatsApp, SMS, etc.). 
              Podrá ingresar de inmediato pegándolo en su pantalla de registro.
            </Text>

            <View style={styles.tokenBox}>
              <Text style={styles.tokenText} selectable>
                {successToken}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.copyBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleCopy}
            >
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.copyBtnText}>Copiar código</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.doneBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Volver a miembros</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
          <Text style={styles.headerTitle}>Invitar familiar</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionSubtitle}>
            Ingresa los datos del miembro que deseas agregar al grupo de cuidado del paciente.
          </Text>

          <Field label="Correo electrónico" error={errors.email || errors.contact}>
            <TextInput
              style={[
                styles.input,
                (errors.email || errors.contact) && styles.inputError,
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          <Field label="Teléfono (opcional)" error={errors.contact}>
            <TextInput
              style={[styles.input, errors.contact && styles.inputError]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Ej. +51999888777"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </Field>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Rol asignado *</Text>
            {ROLES.map((r) => {
              const isSelected = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  style={({ pressed }) => [
                    styles.roleCard,
                    isSelected && { borderColor: r.color, backgroundColor: '#FAF9F7' },
                    pressed && { opacity: 0.95 },
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <View style={[styles.roleIcon, { backgroundColor: isSelected ? r.color : '#F3F4F6' }]}>
                    <Ionicons
                      name={r.icon as any}
                      size={20}
                      color={isSelected ? '#fff' : '#6B7280'}
                    />
                  </View>
                  <View style={styles.roleBody}>
                    <Text style={[styles.roleLabel, isSelected && { color: r.color, fontWeight: '700' }]}>
                      {r.label}
                    </Text>
                    <Text style={styles.roleDesc}>{r.desc}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && { borderColor: r.color }]}>
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: r.color }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              inviteMember.isPending && styles.submitButtonDisabled,
              pressed && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={inviteMember.isPending}
            accessibilityLabel="Crear invitación"
          >
            {inviteMember.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Crear invitación</Text>
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
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
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    marginBottom: 10,
    gap: 12,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleBody: {
    flex: 1,
    gap: 2,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  roleDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF7E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  successSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  tokenBox: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  copyBtn: {
    height: 48,
    width: '100%',
    backgroundColor: '#87A96B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  doneBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneBtnText: {
    color: '#D4856A',
    fontSize: 16,
    fontWeight: '700',
  },
});
