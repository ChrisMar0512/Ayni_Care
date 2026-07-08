import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppointments, useDeleteAppointment } from '../../hooks/useAppointments';
import { useAuthStore } from '../../stores/authStore';
import type { Appointment, AppointmentType, AppointmentStatus } from '../../types/appointment';
import type { AppointmentsStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<AppointmentsStackParamList, 'AppointmentsList'>;

const TYPE_LABELS: Record<AppointmentType, string> = {
  medical: 'Médica',
  therapy: 'Terapia',
  lab: 'Laboratorio',
  pharmacy: 'Farmacia',
  other: 'Otra',
};

const TYPE_ICONS: Record<AppointmentType, React.ComponentProps<typeof Ionicons>['name']> = {
  medical: 'medkit-outline',
  therapy: 'body-outline',
  lab: 'flask-outline',
  pharmacy: 'storefront-outline',
  other: 'calendar-outline',
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  rescheduled: 'Reprogramada',
};

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  scheduled: { bg: '#EFF6FF', text: '#3B82F6' },
  completed: { bg: '#F0FDF4', text: '#22C55E' },
  cancelled: { bg: '#FEF2F2', text: '#EF4444' },
  rescheduled: { bg: '#FFF7ED', text: '#F97316' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function isUpcoming(iso: string): boolean {
  return new Date(iso) >= new Date();
}

function AppointmentCard({
  appointment,
  isPrimaryCaregiver,
  onDelete,
  onEdit,
}: {
  appointment: Appointment;
  isPrimaryCaregiver: boolean;
  onDelete: (id: string, title: string) => void;
  onEdit: (appointment: Appointment) => void;
}) {
  const upcoming = isUpcoming(appointment.scheduledAt);
  const statusStyle = STATUS_COLORS[appointment.status];
  const icon = TYPE_ICONS[appointment.type];

  return (
    <View style={[styles.card, !upcoming && styles.cardPast]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, !upcoming && styles.iconCirclePast]}>
          <Ionicons name={icon} size={20} color={upcoming ? '#D4856A' : '#9CA3AF'} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.appointmentTitle, !upcoming && styles.textPast]} numberOfLines={2}>
              {appointment.title}
            </Text>
            {isPrimaryCaregiver && (
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Pressable
                  onPress={() => onEdit(appointment)}
                  accessibilityLabel="Editar cita"
                  hitSlop={8}
                >
                  <Ionicons name="pencil-outline" size={18} color="#D4856A" />
                </Pressable>
                <Pressable
                  onPress={() => onDelete(appointment.id, appointment.title)}
                  accessibilityLabel="Eliminar cita"
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {STATUS_LABELS[appointment.status]}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
            <Text style={styles.metaText}>{formatDateTime(appointment.scheduledAt)}</Text>
          </View>

          {appointment.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#9CA3AF" />
              <Text style={styles.metaText} numberOfLines={1}>
                {appointment.location}
              </Text>
            </View>
          ) : null}

          {appointment.doctorName ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={13} color="#9CA3AF" />
              <Text style={styles.metaText} numberOfLines={1}>
                {appointment.doctorName}
              </Text>
            </View>
          ) : null}

          <View style={styles.typeRow}>
            <Text style={styles.typeLabel}>{TYPE_LABELS[appointment.type]}</Text>
            {appointment.durationMin ? (
              <Text style={styles.durationText}>{appointment.durationMin} min</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export function AppointmentsScreen() {
  const navigation = useNavigation<NavProp>();
  const { data, isLoading, error, refetch } = useAppointments();
  const deleteAppointment = useDeleteAppointment();
  const { role } = useAuthStore();
  const isPrimaryCaregiver = role === 'primary_caregiver';

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleEdit(appointment: Appointment) {
    navigation.navigate('AddAppointment', { appointment });
  }

  function handleDelete(id: string, title: string) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar la cita "${title}"?`);
      if (confirmed) {
        deleteAppointment.mutate(id);
      }
    } else {
      Alert.alert(
        'Eliminar cita',
        `¿Estás seguro de que deseas eliminar la cita "${title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              deleteAppointment.mutate(id);
            },
          },
        ]
      );
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#D4856A" />
        <Text style={styles.loadingText}>Cargando citas...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar las citas</Text>
        <Text style={styles.errorSub}>Revisa tu conexión e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const appointments = data ?? [];
  const upcoming = appointments.filter((a) => isUpcoming(a.scheduledAt));
  const past = appointments.filter((a) => !isUpcoming(a.scheduledAt));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAppointment')}
          accessibilityLabel="Agendar cita"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#D4856A" />
        </Pressable>
      </View>

      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          appointments.length === 0
            ? [styles.listContent, { flexGrow: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin citas agendadas</Text>
            <Text style={styles.emptySub}>Registra las citas médicas y terapias del paciente</Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddAppointment')}
            >
              <Text style={styles.emptyAddButtonText}>Agendar cita</Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          upcoming.length > 0 && past.length > 0 ? (
            <Text style={styles.sectionHeader}>
              PRÓXIMAS ({upcoming.length})
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        renderItem={({ item, index }) => (
          <>
            {index === upcoming.length && past.length > 0 ? (
              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
                PASADAS ({past.length})
              </Text>
            ) : null}
            <AppointmentCard
              appointment={item}
              isPrimaryCaregiver={isPrimaryCaregiver}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4856A"]}
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
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
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
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPast: {
    opacity: 0.75,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCirclePast: {
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  appointmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  textPast: {
    color: '#6B7280',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4856A',
    backgroundColor: '#FDF0EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    padding: 40,
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
  },
  emptyAddButton: {
    marginTop: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
