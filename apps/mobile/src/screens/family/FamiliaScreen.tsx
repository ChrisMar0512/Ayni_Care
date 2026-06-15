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
import type { FamiliaStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'FamiliaHub'>;

interface SectionCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function SectionCard({ icon, title, description, color, bgColor, onPress }: SectionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
      accessibilityLabel={`Ir a ${title}`}
    >
      <View style={[styles.cardIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </Pressable>
  );
}

export function FamiliaScreen() {
  const navigation = useNavigation<NavProp>();
  const member = useAuthStore((s) => s.member);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Familia</Text>
        {member?.family?.name ? (
          <Text style={styles.headerSub}>{member.family.name}</Text>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>ADMINISTRACIÓN</Text>

        <SectionCard
          icon="receipt-outline"
          title="Gastos compartidos"
          description="Registra y divide los gastos del cuidado entre la familia"
          color="#D4856A"
          bgColor="#FDF0EB"
          onPress={() => navigation.navigate('Gastos')}
        />

        <SectionCard
          icon="document-text-outline"
          title="Notas médicas"
          description="Observaciones, síntomas y entregas de turno entre cuidadores"
          color="#87A96B"
          bgColor="#F0F7EB"
          onPress={() => navigation.navigate('Notas')}
        />

        <SectionCard
          icon="people-outline"
          title="Gestión de miembros"
          description="Invita a miembros de la familia y administra sus roles y accesos"
          color="#3B82F6"
          bgColor="#EFF6FF"
          onPress={() => navigation.navigate('Miembros')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  headerSub: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  cardDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  comingSoon: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  comingSoonSub: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
});
