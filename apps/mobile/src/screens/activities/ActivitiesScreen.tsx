import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SectionList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompleteActivity } from '../../hooks/useActivities';
import { useDashboard, DashboardItem } from '../../hooks/useDashboard';
import { useAdministerMedication } from '../../hooks/useMedications';
import { DashboardItemCard } from '../../components/dashboard/DashboardItemCard';
import type { ActivitiesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'ActivitiesList'>;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function ActivitiesScreen() {
  const navigation = useNavigation<NavProp>();
  const [selectedDate] = useState(todayISO);
  
  const { data, isLoading, error, refetch } = useDashboard(selectedDate);
  const completeActivity = useCompleteActivity();
  const administerMedication = useAdministerMedication();

  const pendientes = (data ?? []).filter((a) => a.status === 'pending');
  const completadas = (data ?? []).filter((a) => a.status !== 'pending');

  function handleCompleteActivity(id: string) {
    completeActivity.mutate({ id });
  }

  function handleCompleteMedication(id: string, timeSlot: string) {
    administerMedication.mutate({ id, skipped: false, notes: `Administrado a la hora programada (${timeSlot})` });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#D4856A" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudo cargar el dashboard</Text>
        <Text style={styles.errorSub}>Revisa tu conexión e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sections: { title: string; data: DashboardItem[] }[] = [];
  if (pendientes.length > 0) {
    sections.push({ title: `Pendientes (${pendientes.length})`, data: pendientes });
  }
  if (completadas.length > 0) {
    sections.push({ title: `Completadas (${completadas.length})`, data: completadas });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard Diario</Text>
          <Text style={styles.headerDate}>{formatDate(selectedDate)}</Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddActivity')}
          accessibilityLabel="Crear actividad"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#D4856A" />
        </Pressable>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin pendientes hoy</Text>
          <Text style={styles.emptySub}>No hay actividades, citas ni medicamentos para este día</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <DashboardItemCard
              item={item}
              onCompleteActivity={handleCompleteActivity}
              onCompleteMedication={handleCompleteMedication}
              isActionPending={
                item.type === 'medication'
                  ? administerMedication.isPending && administerMedication.variables?.id === item.originalId
                  : completeActivity.isPending && completeActivity.variables?.id === item.originalId
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  headerDate: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  emptySub: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
