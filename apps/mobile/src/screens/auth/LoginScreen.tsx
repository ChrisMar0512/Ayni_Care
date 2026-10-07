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

    const isDemo =
      trimmed.toLowerCase() === 'carlos@aynicare.com' ||
      trimmed === '+51999999999' ||
      trimmed.toLowerCase() === 'demo@aynicare.com';

    const otpType: 'email' | 'sms' = inputType === 'email' ? 'email' : 'sms';

    if (isDemo) {
      setIsLoading(false);
      navigation.navigate('OTP', { type: otpType, identifier: trimmed });
      return;
    }

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
      console.warn('[Login] Error con Supabase, usando flujo seguro de demo:', err);
      // En modo demo o presentación, permitir avanzar a la pantalla OTP
      navigation.navigate('OTP', { type: otpType, identifier: trimmed });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    await setAuth(
      { id: 'dev-user-id', email: 'carlos@aynicare.com', phone: '+51999999999' },
      {
        id: 'dev-member-id',
        familyId: 'demo-family-id',
        role: 'primary_caregiver',
        name: 'Carlos Mendoza',
        family: { name: 'Familia Mendoza' },
      },
      'demo-token',
      'demo-refresh-token'
    );
    setIsLoading(false);
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
            Ingresa con tu correo o accede con el perfil de prueba
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: carlos@aynicare.com"
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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O DEMOSTRACIÓN</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>👤 Perfil de Demostración</Text>
            <Text style={styles.demoText}>
              Usuario: <Text style={styles.demoBold}>carlos@aynicare.com</Text>
            </Text>
            <Text style={styles.demoText}>
              Código OTP: <Text style={styles.demoBold}>123456</Text>
            </Text>

            <Pressable
              style={styles.demoButton}
              onPress={handleQuickDemoLogin}
              disabled={isLoading}
            >
              <Text style={styles.demoButtonText}>⚡ Iniciar Sesión Rápido (1-Clic)</Text>
            </Pressable>
          </View>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  demoCard: {
    backgroundColor: '#F0F7F4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#95D5B2',
    padding: 14,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D6A4F',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  demoBold: {
    fontWeight: '700',
    color: '#1B4332',
  },
  demoButton: {
    marginTop: 10,
    backgroundColor: '#2D6A4F',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
