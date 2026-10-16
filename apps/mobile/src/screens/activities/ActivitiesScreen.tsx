import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SectionList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompleteActivity } from '../../hooks/useActivities';
import { useDashboard, DashboardItem } from '../../hooks/useDashboard';
import { useAdministerMedication } from '../../hooks/useMedications';
import { DashboardItemCard } from '../../components/dashboard/DashboardItemCard';
import { useAuthStore } from '../../stores/authStore';
import type { ActivitiesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<ActivitiesStackParamList, 'ActivitiesList'>;

function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDay(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(iso: string): string {
  const today = todayISO();
  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);

  if (iso === today) return 'Hoy';
  if (iso === yesterday) return 'Ayer';
  if (iso === tomorrow) return 'Mañana';

  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function ActivitiesScreen() {
  const navigation = useNavigation<NavProp>();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const { member } = useAuthStore();
  
  const { data, isLoading, error, refetch } = useDashboard(selectedDate);
  const completeActivity = useCompleteActivity();
  const administerMedication = useAdministerMedication();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const pendientes = (data ?? []).filter((a) => a.status === 'pending');
  const completadas = (data ?? []).filter((a) => a.status !== 'pending');
  const totalTasks = (data ?? []).length;
  const completedCount = completadas.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isDateToday = selectedDate === todayISO();

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
        <Text style={styles.loadingText}>Cargando plan de cuidado...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudo cargar el dashboard</Text>
        <Text style={styles.errorSub}>Revisa tu conexión a internet e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sections: { title: string; count: number; isPending: boolean; data: DashboardItem[] }[] = [];
  if (pendientes.length > 0) {
    sections.push({ title: 'Pendientes por realizar', count: pendientes.length, isPending: true, data: pendientes });
  }
  if (completadas.length > 0) {
    sections.push({ title: 'Completadas del día', count: completadas.length, isPending: false, data: completadas });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera Principal */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerGreeting}>
            Hola{member?.name ? `, ${member.name.split(' ')[0]}` : ''} 👋
          </Text>
          <Text style={styles.headerFamilyName}>
            {member?.family?.name || 'Ayni Care'}
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddActivity')}
          accessibilityLabel="Crear nueva actividad"
          hitSlop={8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nueva</Text>
        </Pressable>
      </View>

      {/* Selector de Fecha Horizontal */}
      <View style={styles.dateSelector}>
        <Pressable
          style={styles.dateArrow}
          onPress={() => setSelectedDate((cur) => shiftDay(cur, -1))}
          accessibilityLabel="Día anterior"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#4B5563" />
        </Pressable>

        <Pressable
          style={[styles.dateCenter, isDateToday && styles.dateCenterActive]}
          onPress={() => setSelectedDate(todayISO())}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={isDateToday ? '#D4856A' : '#6B7280'}
          />
          <Text style={[styles.dateCenterText, isDateToday && styles.dateCenterTextActive]}>
            {formatDateLabel(selectedDate)} · {formatFullDate(selectedDate)}
          </Text>
          {!isDateToday && (
            <View style={styles.returnTodayBadge}>
              <Text style={styles.returnTodayText}>Volver a Hoy</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={styles.dateArrow}
          onPress={() => setSelectedDate((cur) => shiftDay(cur, 1))}
          accessibilityLabel="Día siguiente"
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={20} color="#4B5563" />
        </Pressable>
      </View>

      {/* Tarjeta Resumen de Adherencia y Cuidados */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIconBox}>
            <Ionicons name="shield-checkmark" size={22} color="#D4856A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>Estado del Cuidado</Text>
            <Text style={styles.summarySubtitle}>
              {totalTasks === 0
                ? 'No hay actividades registradas para esta fecha'
                : `${completedCount} de ${totalTasks} tareas listas (${progressPercent}%)`}
            </Text>
          </View>
          {totalTasks > 0 && (
            <View style={[styles.percentBadge, progressPercent === 100 && styles.percentBadgeFull]}>
              <Text style={[styles.percentBadgeText, progressPercent === 100 && styles.percentBadgeTextFull]}>
                {progressPercent}%
              </Text>
            </View>
          )}
        </View>

        {totalTasks > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </View>

      {/* Lista de Tareas y Medicamentos */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          sections.length === 0
            ? [styles.listContent, { flexGrow: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={40} color="#D4856A" />
            </View>
            <Text style={styles.emptyTitle}>Día libre de tareas</Text>
            <Text style={styles.emptySub}>
              No hay medicinas ni citas programadas para el {formatDateLabel(selectedDate).toLowerCase()}.
            </Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddActivity')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddText}>Programar primera actividad</Text>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
            <View style={[styles.countBadge, section.isPending ? styles.countBadgePending : styles.countBadgeDone]}>
              <Text style={[styles.countBadgeText, section.isPending ? styles.countBadgeTextPending : styles.countBadgeTextDone]}>
                {section.count}
              </Text>
            </View>
          </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D4856A']}
            tintColor="#D4856A"
          />
        }
      />
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
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerFamilyName: {
    fontSize: 15,
    color: '#87A96B',
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4856A',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  dateArrow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE6DF',
    paddingHorizontal: 10,
  },
  dateCenterActive: {
    borderColor: '#F3D2C6',
    backgroundColor: '#FDF6F3',
  },
  dateCenterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  dateCenterTextActive: {
    color: '#D4856A',
    fontWeight: '700',
  },
  returnTodayBadge: {
    backgroundColor: '#D4856A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  returnTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE6DF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: '#FDF0EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentBadgeFull: {
    backgroundColor: '#F0F7EB',
  },
  percentBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D4856A',
  },
  percentBadgeTextFull: {
    color: '#87A96B',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#87A96B',
    borderRadius: 3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgePending: {
    backgroundColor: '#FDF0EB',
  },
  countBadgeDone: {
    backgroundColor: '#F0F7EB',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countBadgeTextPending: {
    color: '#D4856A',
  },
  countBadgeTextDone: {
    color: '#87A96B',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D4856A',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
