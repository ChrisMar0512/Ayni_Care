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
import { useMedications, useAdministerMedication, useDeleteMedication } from '../../hooks/useMedications';
import { useAuthStore } from '../../stores/authStore';
import type { Medication } from '../../types/medication';
import type { MedicationsStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<MedicationsStackParamList, 'MedicationsList'>;

function todayAdministeredCount(medication: Medication): number {
  return medication.logs.filter((l) => !l.skipped).length;
}

function MedicationCard({
  medication,
  onAdminister,
  isAdministering,
  isPrimaryCaregiver,
  onDelete,
  onEdit,
}: {
  medication: Medication;
  onAdminister: (id: string) => void;
  isAdministering: boolean;
  isPrimaryCaregiver: boolean;
  onDelete: (id: string, name: string) => void;
  onEdit: (medication: Medication) => void;
}) {
  const dosesGiven = todayAdministeredCount(medication);
  const totalTimes = medication.times.length;
  const allDone = dosesGiven >= totalTimes;
  const isLowStock = medication.stock !== null && medication.stock !== undefined && medication.stock <= 5;

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, allDone ? styles.iconCircleDone : styles.iconCircleActive]}>
          <Ionicons name="medical" size={22} color={allDone ? '#FFFFFF' : '#D4856A'} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.medName, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
              {medication.name}
            </Text>
            {isPrimaryCaregiver && (
              <View style={styles.actionIconsRow}>
                <Pressable
                  onPress={() => onEdit(medication)}
                  accessibilityLabel="Editar medicamento"
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <Ionicons name="pencil-outline" size={20} color="#D4856A" />
                </Pressable>
                <Pressable
                  onPress={() => onDelete(medication.id, medication.name)}
                  accessibilityLabel="Eliminar medicamento"
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.medDosage}>
            {medication.dosage}
            {medication.form ? ` · ${medication.form}` : ''}
          </Text>

          {/* Horarios de toma */}
          <View style={styles.timesRow}>
            {medication.times.map((t) => (
              <View key={t} style={styles.timeBadge}>
                <Ionicons name="time-outline" size={13} color="#D4856A" />
                <Text style={styles.timeBadgeText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Indicaciones médicas */}
          {medication.instructions ? (
            <Text style={styles.instructions} numberOfLines={2}>
              Indicación: {medication.instructions}
            </Text>
          ) : null}

          {/* Alerta de Stock Bajo */}
          {isLowStock && (
            <View style={styles.lowStockBanner}>
              <Ionicons name="warning" size={14} color="#D97706" />
              <Text style={styles.lowStockText}>
                Stock bajo: quedan {medication.stock} {medication.form || 'unidades'} en casa
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Pie de tarjeta con botón accesible de 48px */}
      <View style={styles.cardFooter}>
        <View style={styles.doseStatus}>
          <Ionicons
            name={allDone ? 'checkmark-circle' : 'time-outline'}
            size={16}
            color={allDone ? '#87A96B' : '#D4856A'}
          />
          <Text style={[styles.doseStatusText, allDone && styles.doseStatusDone]}>
            {dosesGiven}/{totalTimes} {dosesGiven === 1 ? 'dosis dada' : 'dosis dadas'} hoy
          </Text>
          {medication.stock !== null && !isLowStock && (
            <Text style={styles.stockText}>· Stock: {medication.stock}</Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.adminButton,
            allDone && styles.adminButtonDone,
            pressed && styles.adminButtonPressed,
          ]}
          onPress={() => !allDone && onAdminister(medication.id)}
          disabled={allDone || isAdministering}
          accessibilityLabel={allDone ? 'Dosis completadas por hoy' : 'Registrar toma de dosis'}
        >
          {isAdministering ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : allDone ? (
            <View style={styles.buttonInnerRow}>
              <Ionicons name="checkmark" size={18} color="#87A96B" />
              <Text style={styles.adminButtonTextDone}>Listo por hoy</Text>
            </View>
          ) : (
            <View style={styles.buttonInnerRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.adminButtonText}>Registrar toma</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function MedicationsScreen() {
  const navigation = useNavigation<NavProp>();
  const { data, isLoading, error, refetch } = useMedications();
  const administerMedication = useAdministerMedication();
  const deleteMedication = useDeleteMedication();
  const { role } = useAuthStore();
  const isPrimaryCaregiver = role === 'primary_caregiver';

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleAdminister(id: string) {
    administerMedication.mutate({ id });
  }

  function handleEdit(medication: Medication) {
    navigation.navigate('AddMedication', { medication });
  }

  function handleDelete(id: string, name: string) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`);
      if (confirmed) {
        deleteMedication.mutate(id);
      }
    } else {
      Alert.alert(
        'Eliminar medicamento',
        `¿Estás seguro de que deseas eliminar "${name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              deleteMedication.mutate(id);
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
        <Text style={styles.loadingText}>Cargando medicamentos...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar los medicamentos</Text>
        <Text style={styles.errorSub}>Revisa tu conexión a internet e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const medications = data ?? [];
  const lowStockCount = medications.filter((m) => m.stock !== null && m.stock !== undefined && m.stock <= 5).length;
  const totalDosesToday = medications.reduce((acc, m) => acc + m.times.length, 0);
  const totalDosesGivenToday = medications.reduce((acc, m) => acc + todayAdministeredCount(m), 0);
  const dosesPercent = totalDosesToday > 0 ? Math.round((totalDosesGivenToday / totalDosesToday) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Medicina</Text>
          <Text style={styles.headerSubtitle}>
            {medications.length} {medications.length === 1 ? 'medicamento activo' : 'medicamentos activos'}
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMedication')}
          accessibilityLabel="Agregar nuevo medicamento"
          hitSlop={8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nuevo</Text>
        </Pressable>
      </View>

      {/* Banner Resumen de Adherencia a Tratamiento */}
      {medications.length > 0 && (
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewIconBox}>
              <Ionicons name="time" size={20} color="#87A96B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overviewTitle}>Control de Dosis de Hoy</Text>
              <Text style={styles.overviewSubtitle}>
                {totalDosesGivenToday} de {totalDosesToday} dosis tomadas ({dosesPercent}%)
              </Text>
            </View>
            <View style={[styles.percentBadge, dosesPercent === 100 && styles.percentBadgeFull]}>
              <Text style={[styles.percentBadgeText, dosesPercent === 100 && styles.percentBadgeTextFull]}>
                {dosesPercent}%
              </Text>
            </View>
          </View>

          {/* Barra de progreso de tomas */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${dosesPercent}%` }]} />
          </View>

          {/* Alerta si hay medicamentos con stock bajo */}
          {lowStockCount > 0 && (
            <View style={styles.lowStockGlobalBanner}>
              <Ionicons name="warning" size={16} color="#D97706" />
              <Text style={styles.lowStockGlobalText}>
                {lowStockCount} {lowStockCount === 1 ? 'medicamento con poco stock' : 'medicamentos con poco stock'}. Recuerda reponerlos.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Lista de Medicamentos */}
      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          medications.length === 0
            ? [styles.listContent, { flexGrow: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="medical-outline" size={44} color="#D4856A" />
            </View>
            <Text style={styles.emptyTitle}>Sin medicamentos registrados</Text>
            <Text style={styles.emptySub}>
              Registra los medicamentos de tu familiar con sus dosis y horarios para que toda la familia sepa cuándo dárselos.
            </Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Registrar primer medicamento</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <MedicationCard
            medication={item}
            onAdminister={handleAdminister}
            isPrimaryCaregiver={isPrimaryCaregiver}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isAdministering={
              administerMedication.isPending &&
              administerMedication.variables?.id === item.id
            }
          />
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
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
  overviewCard: {
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
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  overviewSubtitle: {
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
  lowStockGlobalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  lowStockGlobalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EAE6DF',
  },
  cardDone: {
    backgroundColor: '#FAF9F6',
    borderColor: '#E5E7EB',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleActive: {
    backgroundColor: '#FDF0EB',
  },
  iconCircleDone: {
    backgroundColor: '#87A96B',
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  actionIconsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
  },
  medName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  medDosage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF0EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeBadgeText: {
    fontSize: 13,
    color: '#D4856A',
    fontWeight: '700',
  },
  instructions: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  lowStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 12,
  },
  doseStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  doseStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  doseStatusDone: {
    color: '#87A96B',
  },
  stockText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  adminButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonDone: {
    backgroundColor: '#F0F7EB',
    borderWidth: 1,
    borderColor: '#D1E7DD',
  },
  adminButtonPressed: {
    opacity: 0.8,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminButtonTextDone: {
    fontSize: 14,
    fontWeight: '700',
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
  emptyAddButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
