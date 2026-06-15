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

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'CreateFamily'>;

export function CreateFamilyScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, setMember } = useAuthStore();

  const [familyName, setFamilyName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [elderlyName, setElderlyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (familyName.trim().length < 2) {
      newErrors.familyName = 'El nombre de la familia debe tener al menos 2 letras';
    }
    if (memberName.trim().length < 2) {
      newErrors.memberName = 'Tu nombre debe tener al menos 2 letras';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const body = {
        familyName: familyName.trim(),
        memberName: memberName.trim(),
        memberEmail: user?.email || undefined,
        memberPhone: user?.phone || undefined,
        elderlyName: elderlyName.trim() || undefined,
      };

      const { data: response } = await api.post<ApiResponse<any>>('/api/family', body);

      if (!response.success || !response.data) {
        Alert.alert('Error', response.error ?? 'No se pudo crear el grupo familiar');
        return;
      }

      const { family, member } = response.data;
      
      // Mapear respuesta del backend al formato AuthMember de Zustand
      const authMember = {
        id: member.id,
        familyId: member.familyId,
        role: member.role,
        name: member.name,
        family: { name: family.name },
      };

      await setMember(authMember);
    } catch (err) {
      console.error('[Create Family Error]', err);
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
          <Text style={styles.headerTitle}>Crear Grupo Familiar</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>
            Registra los datos iniciales para crear el espacio de cuidado de tu familiar mayor.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Tu nombre *</Text>
              <TextInput
                style={[styles.input, errors.memberName && styles.inputError]}
                value={memberName}
                onChangeText={(v) => {
                  setMemberName(v);
                  setErrors((prev) => ({ ...prev, memberName: '' }));
                }}
                placeholder="Ej. Juan Gómez"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
              />
              {errors.memberName && <Text style={styles.errorText}>{errors.memberName}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre de la familia *</Text>
              <TextInput
                style={[styles.input, errors.familyName && styles.inputError]}
                value={familyName}
                onChangeText={(v) => {
                  setFamilyName(v);
                  setErrors((prev) => ({ ...prev, familyName: '' }));
                }}
                placeholder="Ej. Familia Gómez"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
              />
              {errors.familyName && <Text style={styles.errorText}>{errors.familyName}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre del adulto mayor (Opcional)</Text>
              <TextInput
                style={styles.input}
                value={elderlyName}
                onChangeText={setElderlyName}
                placeholder="Ej. Abuela María"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
              />
              <Text style={styles.hint}>Podrás añadir condiciones médicas más adelante.</Text>
            </View>

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Crear Grupo Familiar</Text>
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
  hint: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 6,
  },
  button: {
    height: 52,
    backgroundColor: '#D4856A',
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
