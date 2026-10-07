import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { ApiResponse } from '@ayni-care/shared';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'JoinFamily'>;

export function JoinFamilyScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, setMember } = useAuthStore();

  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 2) {
      newErrors.name = 'Tu nombre debe tener al menos 2 letras';
    }
    if (token.trim().length < 10) {
      newErrors.token = 'Ingresa un código de invitación válido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleJoin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const body = {
        token: token.trim(),
        name: name.trim(),
        email: user?.email || undefined,
        phone: user?.phone || undefined,
      };

      const { data: response } = await api.post<ApiResponse<any>>('/api/family/join', body);

      if (!response.success || !response.data) {
        Alert.alert('Error', response.error ?? 'No se pudo unir al grupo familiar. Verifica el código de invitación.');
        return;
      }

      const { memberId, familyId, familyName, role, name: memberName } = response.data;

      // Mapear respuesta del backend al formato AuthMember de Zustand
      const authMember = {
        id: memberId,
        familyId,
        role,
        name: memberName,
        family: { name: familyName },
      };

      await setMember(authMember);
    } catch (err) {
      console.error('[Join Family Error]', err);
      Alert.alert('Error de red', 'Hubo un problema al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#2C2C2C" />
          </Pressable>
          <Text style={styles.headerTitle}>Unirse a Familia</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>
            Ingresa el código que te envió tu familiar para unirte al mismo grupo de cuidado.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Tu nombre *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Ej. Carlos Gómez"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Código de invitación *</Text>
              <TextInput
                style={[styles.input, errors.token && styles.inputError]}
                value={token}
                onChangeText={(v) => {
                  setToken(v);
                  setErrors((prev) => ({ ...prev, token: '' }));
                }}
                placeholder="Pega el código de acceso aquí"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.token && <Text style={styles.errorText}>{errors.token}</Text>}
            </View>

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Unirse al Grupo</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#E0DDD8',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    color: '#6B7C6B',
    lineHeight: 22,
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E0DDD8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2C2C2C',
    backgroundColor: '#FAFAF9',
  },
  inputError: {
    borderColor: '#E63946',
  },
  errorText: {
    fontSize: 13,
    color: '#E63946',
    marginTop: 4,
  },
  button: {
    height: 52,
    backgroundColor: '#87A96B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
