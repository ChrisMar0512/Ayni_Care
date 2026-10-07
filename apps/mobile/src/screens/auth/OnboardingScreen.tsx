import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';

type NavProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingHub'>;

export function OnboardingScreen() {
  const navigation = useNavigation<NavProp>();
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={logout}
          hitSlop={8}
          accessibilityLabel="Volver al inicio de sesión"
        >
          <Ionicons name="chevron-back" size={24} color="#2C2C2C" />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.appName}>Ayni Care</Text>
          <Text style={styles.title}>¡Hola! Te damos la bienvenida</Text>
          <Text style={styles.subtitle}>
            Para comenzar a coordinar el cuidado familiar, necesitamos configurar tu acceso a un grupo.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardCreate, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('CreateFamily')}
            accessibilityLabel="Crear un nuevo grupo familiar"
          >
            <View style={[styles.iconContainer, styles.iconContainerCreate]}>
              <Ionicons name="people" size={32} color="#D4856A" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Crear nuevo grupo familiar</Text>
              <Text style={styles.cardDescription}>
                Si eres el cuidador principal y vas a registrar al adulto mayor y organizar las actividades por primera vez.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#D4856A" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.card, styles.cardJoin, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('JoinFamily')}
            accessibilityLabel="Unirse a una familia existente"
          >
            <View style={[styles.iconContainer, styles.iconContainerJoin]}>
              <Ionicons name="key" size={32} color="#87A96B" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Unirse con código de invitación</Text>
              <Text style={styles.cardDescription}>
                Si otro miembro de tu familia ya creó el grupo y te envió una invitación con un código de acceso.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#87A96B" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 48,
    minWidth: 80,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4856A',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7C6B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCreate: {
    borderColor: '#FDF0EB',
  },
  cardJoin: {
    borderColor: '#F0F7EB',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerCreate: {
    backgroundColor: '#FDF0EB',
  },
  iconContainerJoin: {
    backgroundColor: '#F0F7EB',
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#9E9E9E',
    lineHeight: 18,
  },
});
