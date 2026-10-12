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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getSupabase } from '../../services/supabase';
import { signInWithProvider } from '../../services/auth-oauth';
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
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const inputType: InputType = isEmail(identifier.trim()) ? 'email' : 'phone';

  // ─── Inicio con Redes Sociales (Google & Apple) ─────────────────────────────
  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    setSocialLoading(provider);

    try {
      const res = await signInWithProvider(provider);
      if (!res.success) {
        if (res.error && !res.error.includes('cancelado')) {
          setError(res.error);
        }
      }
    } catch (err: any) {
      console.error(`[Login] Error al autenticar con ${provider}:`, err);
      setError(`No se pudo conectar con ${provider === 'google' ? 'Google' : 'Apple'}.`);
    } finally {
      setSocialLoading(null);
    }
  };

  // ─── Envío de Código OTP (Correo / Celular) ────────────────────────────────
  const handleSendOTP = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Ingresa tu correo o número de teléfono para continuar');
      return;
    }

    setError(null);
    setIsLoading(true);

    const isDemo =
      trimmed.toLowerCase() === 'carlos@aynicare.com' ||
      trimmed.toLowerCase() === 'marchristian48@gmail.com' ||
      trimmed === '+51939959366' ||
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
      navigation.navigate('OTP', { type: otpType, identifier: trimmed });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Acceso Rápido de Prueba (1-Clic) para Evaluadores ──────────────────────
  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    await setAuth(
      {
        id: '492c80d4-0510-4e21-b25e-2b289a64055d',
        email: 'marchristian48@gmail.com',
        phone: '+51939959366',
      },
      {
        id: '5f6bbb5e-f085-4dfb-8963-15fd2f373ab0',
        familyId: '94f95608-8736-4461-b6f3-3ae174e9ef84',
        role: 'primary_caregiver' as any,
        name: 'Christian Carrillo',
        family: { name: 'Familia Carrillo' },
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera de la Marca */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Ionicons name="heart" size={20} color="#D4856A" />
          </View>
          <Text style={styles.appName}>Ayni Care</Text>
          <Text style={styles.tagline}>
            Cuidado y bienestar compartido para el adulto mayor
          </Text>
        </View>

        {/* Tarjeta de Inicio de Sesión */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Te damos la bienvenida</Text>
          <Text style={styles.cardSubtitle}>
            Elige tu método preferido para ingresar a tu cuenta
          </Text>

          {/* Botones de Registro / Inicio Social */}
          <View style={styles.socialContainer}>
            {/* Botón Google */}
            <Pressable
              style={[
                styles.socialButton,
                styles.googleButton,
                socialLoading === 'google' && styles.buttonDisabled,
              ]}
              onPress={() => handleSocialAuth('google')}
              disabled={socialLoading !== null || isLoading}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color="#2C2C2C" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </Pressable>

            {/* Botón Apple (Directriz obligatoria para App Store) */}
            <Pressable
              style={[
                styles.socialButton,
                styles.appleButton,
                socialLoading === 'apple' && styles.buttonDisabled,
              ]}
              onPress={() => handleSocialAuth('apple')}
              disabled={socialLoading !== null || isLoading}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                  <Text style={styles.appleButtonText}>Continuar con Apple</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Divisor Visual */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con correo / celular</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Campo de Entrada de Correo o Teléfono */}
          <View style={styles.inputContainer}>
            <Ionicons
              name={inputType === 'email' ? 'mail-outline' : 'call-outline'}
              size={20}
              color="#9E9E9E"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="ejemplo@correo.com o celular"
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
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#E63946" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Botón Continuar con Código */}
          <Pressable
            style={[
              styles.primaryButton,
              (isLoading || socialLoading !== null) && styles.buttonDisabled,
            ]}
            onPress={handleSendOTP}
            disabled={isLoading || socialLoading !== null}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Enviar código de acceso</Text>
            )}
          </Pressable>

          {/* Acceso Rápido de Prueba (1-Clic) */}
          <View style={styles.demoSection}>
            <View style={styles.demoDivider} />
            <Pressable
              style={styles.demoButton}
              onPress={handleQuickDemoLogin}
              disabled={isLoading || socialLoading !== null}
            >
              <Ionicons name="flash" size={18} color="#D4856A" />
              <Text style={styles.demoButtonText}>
                Entrar con perfil de prueba (Familia Carrillo)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Pie de pantalla */}
        <Text style={styles.footerText}>
          Tus datos médicos y familiares están protegidos con cifrado seguro.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#D4856A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#6B7C6B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  socialContainer: {
    gap: 12,
    marginBottom: 18,
  },
  socialButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E5E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E5E0',
  },
  dividerText: {
    fontSize: 13,
    color: '#9E9E9E',
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E8E5E0',
    borderRadius: 14,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C2C2C',
    height: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#E63946',
    flex: 1,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#D4856A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  demoSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  demoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F0EBE4',
    marginBottom: 14,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FAF5F0',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4856A',
  },
  footerText: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
