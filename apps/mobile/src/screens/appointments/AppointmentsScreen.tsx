import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppointments, useDeleteAppointment } from '../../hooks/useAppointments';
import { useAuthStore } from '../../stores/authStore';
import type { Appointment, AppointmentType, AppointmentStatus } from '../../types/appointment';
import type { AppointmentsStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<AppointmentsStackParamList, 'AppointmentsList'>;

const TYPE_LABELS: Record<AppointmentType, string> = {
  medical: 'Consulta Médica',
  therapy: 'Terapia / Rehab',
  lab: 'Laboratorio / Análisis',
  pharmacy: 'Farmacia',
  other: 'Otra Cita',
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

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string; border: string }> = {
  scheduled: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  completed: { bg: '#EBF4EC', text: '#2D6A4F', border: '#C2E0C6' },
  cancelled: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  rescheduled: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
};

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} · ${timeStr}`;
}

function getRelativeDateInfo(iso: string): { label: string; isUrgent: boolean } {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const apptDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((apptDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Hoy', isUrgent: true };
  if (diffDays === 1) return { label: 'Mañana', isUrgent: true };
  if (diffDays === -1) return { label: 'Ayer', isUrgent: false };
  if (diffDays > 1 && diffDays <= 7) return { label: `En ${diffDays} días`, isUrgent: false };
  return { label: '', isUrgent: false };
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
  const statusStyle = STATUS_COLORS[appointment.status] || STATUS_COLORS.scheduled;
  const icon = TYPE_ICONS[appointment.type] || 'calendar-outline';
  const relativeDate = getRelativeDateInfo(appointment.scheduledAt);

  return (
    <View style={[styles.card, !upcoming && styles.cardPast]}>
      {/* Top Header inside Card */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconCircle, !upcoming && styles.iconCirclePast]}>
            <Ionicons name={icon} size={22} color={upcoming ? '#D4856A' : '#9CA3AF'} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {STATUS_LABELS[appointment.status] || appointment.status}
                </Text>
              </View>
              {upcoming && relativeDate.label ? (
                <View style={[styles.relativeBadge, relativeDate.isUrgent && styles.relativeBadgeUrgent]}>
                  <Text style={[styles.relativeText, relativeDate.isUrgent && styles.relativeTextUrgent]}>
                    {relativeDate.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.appointmentTitle, !upcoming && styles.textPast]} numberOfLines={2}>
              {appointment.title}
            </Text>
          </View>
        </View>
      </View>

      {/* Date & Time Highlight */}
      <View style={styles.dateTimeBanner}>
        <Ionicons name="time-outline" size={17} color={upcoming ? '#D4856A' : '#6B7280'} />
        <Text style={[styles.dateTimeText, !upcoming && styles.textPast]}>
          {formatFullDate(appointment.scheduledAt)}
        </Text>
        {appointment.durationMin ? (
          <Text style={styles.durationChip}>({appointment.durationMin} min)</Text>
        ) : null}
      </View>

      {/* Meta Information (Doctor, Location, Notes) */}
      <View style={styles.metaContainer}>
        {appointment.doctorName ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText} numberOfLines={1}>
              Especialista: <Text style={styles.metaBold}>{appointment.doctorName}</Text>
            </Text>
          </View>
        ) : null}

        {appointment.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText} numberOfLines={2}>
              Lugar: <Text style={styles.metaBold}>{appointment.location}</Text>
            </Text>
          </View>
        ) : null}

        {appointment.notes ? (
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={16} color="#9CA3AF" />
            <Text style={styles.notesText} numberOfLines={2}>
              {appointment.notes}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Footer: Category label and Caregiver Action Buttons */}
      <View style={styles.cardFooter}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeLabel}>{TYPE_LABELS[appointment.type] || appointment.type}</Text>
        </View>

        {isPrimaryCaregiver && (
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={styles.actionButtonEdit}
              onPress={() => onEdit(appointment)}
              accessibilityLabel={`Editar cita ${appointment.title}`}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={16} color="#D4856A" />
              <Text style={styles.actionButtonEditText}>Editar</Text>
            </Pressable>
            <Pressable
              style={styles.actionButtonDelete}
              onPress={() => onDelete(appointment.id, appointment.title)}
              accessibilityLabel={`Eliminar cita ${appointment.title}`}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </Pressable>
          </View>
        )}
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
        <Text style={styles.loadingText}>Cargando agenda médica...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar las citas</Text>
        <Text style={styles.errorSub}>Revisa tu conexión a internet e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const appointments = data ?? [];
  const upcoming = appointments
    .filter((a) => isUpcoming(a.scheduledAt))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = appointments
    .filter((a) => !isUpcoming(a.scheduledAt))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const nextAppointment = upcoming.length > 0 ? upcoming[0] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Agenda</Text>
          <Text style={styles.headerSubtitle}>Citas médicas y consultas familiares</Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAppointment')}
          accessibilityLabel="Agendar nueva cita médica"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
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
        ListHeaderComponent={
          appointments.length > 0 ? (
            <View style={styles.topSection}>
              {/* Hero Banner for Next Priority Appointment */}
              {nextAppointment ? (
                <View style={styles.nextHeroCard}>
                  <View style={styles.nextHeroBadgeRow}>
                    <View style={styles.nextHeroTag}>
                      <Ionicons name="alarm-outline" size={14} color="#D4856A" />
                      <Text style={styles.nextHeroTagText}>PRÓXIMA EN AGENDA</Text>
                    </View>
                    <Text style={styles.nextHeroDate}>
                      {getRelativeDateInfo(nextAppointment.scheduledAt).label || 'Pronto'}
                    </Text>
                  </View>
                  <Text style={styles.nextHeroTitle} numberOfLines={2}>
                    {nextAppointment.title}
                  </Text>
                  <View style={styles.nextHeroDetails}>
                    <View style={styles.nextHeroDetailItem}>
                      <Ionicons name="calendar-outline" size={15} color="#4B5563" />
                      <Text style={styles.nextHeroDetailText}>
                        {formatFullDate(nextAppointment.scheduledAt)}
                      </Text>
                    </View>
                    {nextAppointment.doctorName ? (
                      <View style={styles.nextHeroDetailItem}>
                        <Ionicons name="person-outline" size={15} color="#4B5563" />
                        <Text style={styles.nextHeroDetailText}>
                          {nextAppointment.doctorName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {upcoming.length > 0 ? (
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Próximas consultas</Text>
                  <View style={styles.countBadgePending}>
                    <Text style={styles.countTextPending}>{upcoming.length}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={48} color="#D4856A" />
            </View>
            <Text style={styles.emptyTitle}>Sin citas agendadas</Text>
            <Text style={styles.emptySub}>
              Lleva el control de visitas al médico, exámenes de laboratorio y terapias físicas en un solo lugar.
            </Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddAppointment')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Agendar primera cita</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            {index === upcoming.length && past.length > 0 ? (
              <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                <Text style={styles.sectionTitle}>Historial / Citas pasadas</Text>
                <View style={styles.countBadgeDone}>
                  <Text style={styles.countTextDone}>{past.length}</Text>
                </View>
              </View>
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  topSection: {
    marginBottom: 8,
  },
  nextHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F3D9CF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  nextHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nextHeroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDF0EB',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nextHeroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4856A',
    letterSpacing: 0.6,
  },
  nextHeroDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D4856A',
  },
  nextHeroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    lineHeight: 24,
  },
  nextHeroDetails: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  nextHeroDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextHeroDetailText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  countBadgePending: {
    backgroundColor: '#FDF0EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countTextPending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D4856A',
  },
  countBadgeDone: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countTextDone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DFD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardPast: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E7EB',
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  relativeBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  relativeBadgeUrgent: {
    backgroundColor: '#FEF3C7',
  },
  relativeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  relativeTextUrgent: {
    color: '#B45309',
  },
  appointmentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 22,
  },
  textPast: {
    color: '#6B7280',
  },
  dateTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  durationChip: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  metaContainer: {
    gap: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    lineHeight: 19,
  },
  metaBold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  notesText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FDF0EB',
    justifyContent: 'center',
  },
  actionButtonEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4856A',
  },
  actionButtonDelete: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptySub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddButton: {
    marginTop: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

