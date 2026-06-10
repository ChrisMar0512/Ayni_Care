import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getSupabase } from '../../services/supabase';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type InputType = 'email' | 'phone';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('0') ? `+${digits.slice(1)}` : `+${digits}`;
}

// TODO: REMOVER ANTES DE PRODUCCIÓN — botón temporal para testing sin auth
const DEV_MOCK_USER = { id: 'dev-user-id', email: 'dev@aynicare.local' };
const DEV_MOCK_MEMBER = {
  id: 'dev-member-id',
  familyId: 'dev-family-id',
  role: 'primary_caregiver' as const,
  name: 'Usuario Dev',
  family: { name: 'Familia de prueba' },
};

export function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const inputType: InputType = isEmail(identifier.trim()) ? 'email' : 'phone';

  const handleSendOTP = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Ingresa tu correo o número de teléfono');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabase();
      if (inputType === 'email') {
        const { error: supabaseError } = await supabase.auth.signInWithOtp({
          email: trimmed,
        });
        if (supabaseError) throw new Error(supabaseError.message);
        navigation.navigate('OTP', { type: 'email', identifier: trimmed });
      } else {
        const phone = normalizePhone(trimmed);
        const { error: supabaseError } = await supabase.auth.signInWithOtp({
          phone,
        });
        if (supabaseError) throw new Error(supabaseError.message);
        navigation.navigate('OTP', { type: 'sms', identifier: phone });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar el código';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>Ayni Care</Text>
          <Text style={styles.tagline}>Coordinación de cuidado familiar</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>
          <Text style={styles.formSubtitle}>
            Te enviaremos un código de verificación
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo o teléfono"
            placeholderTextColor="#9E9E9E"
            value={identifier}
            onChangeText={(v) => {
              setIdentifier(v);
              setError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar código</Text>
            )}
          </Pressable>

          {/* TODO: REMOVER ANTES DE PRODUCCIÓN — botón temporal para testing sin auth */}
          {__DEV__ && (
            <Pressable
              style={styles.devButton}
              onPress={() => setAuth(DEV_MOCK_USER, DEV_MOCK_MEMBER, 'dev-token', 'dev-refresh')}
              accessibilityLabel="Entrar sin iniciar sesión (solo desarrollo)"
            >
              <Text style={styles.devButtonText}>
                Entrar sin iniciar sesión (solo desarrollo)
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#D4856A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7C6B',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6B7C6B',
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E0DDD8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2C2C2C',
    backgroundColor: '#FAFAF9',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#E63946',
    marginBottom: 12,
  },
  button: {
    height: 52,
    backgroundColor: '#D4856A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  devButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F4B860',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  devButtonText: {
    color: '#F4B860',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
