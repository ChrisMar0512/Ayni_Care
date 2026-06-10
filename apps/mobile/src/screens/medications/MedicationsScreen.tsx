import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedications, useAdministerMedication } from '../../hooks/useMedications';
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
}: {
  medication: Medication;
  onAdminister: (id: string) => void;
  isAdministering: boolean;
}) {
  const dosesGiven = todayAdministeredCount(medication);
  const totalTimes = medication.times.length;
  const allDone = dosesGiven >= totalTimes;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, allDone && styles.iconCircleDone]}>
          <Ionicons name="medical" size={20} color={allDone ? '#fff' : '#D4856A'} />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.medName} numberOfLines={1}>
            {medication.name}
          </Text>
          <Text style={styles.medDosage}>
            {medication.dosage}
            {medication.form ? ` · ${medication.form}` : ''}
          </Text>

          <View style={styles.timesRow}>
            {medication.times.map((t) => (
              <View key={t} style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{t}</Text>
              </View>
            ))}
          </View>

          {medication.instructions ? (
            <Text style={styles.instructions} numberOfLines={2}>
              {medication.instructions}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.doseStatus}>
          <Ionicons
            name={allDone ? 'checkmark-circle' : 'time-outline'}
            size={14}
            color={allDone ? '#87A96B' : '#9CA3AF'}
          />
          <Text style={[styles.doseStatusText, allDone && styles.doseStatusDone]}>
            {dosesGiven}/{totalTimes} dosis hoy
          </Text>
          {medication.stock !== null && (
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
          accessibilityLabel="Administrar dosis"
        >
          {isAdministering ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.adminButtonText, allDone && styles.adminButtonTextDone]}>
              {allDone ? 'Completo' : 'Administrar'}
            </Text>
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

  function handleAdminister(id: string) {
    administerMedication.mutate({ id });
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
        <Ionicons name="cloud-offline-outline" size={48} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar los medicamentos</Text>
        <Text style={styles.errorSub}>Revisa tu conexión e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const medications = data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medicamentos</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMedication')}
          accessibilityLabel="Agregar medicamento"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#D4856A" />
        </Pressable>
      </View>

      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin medicamentos activos</Text>
          <Text style={styles.emptySub}>Agrega los medicamentos del paciente para llevar el control</Text>
          <Pressable
            style={styles.emptyAddButton}
            onPress={() => navigation.navigate('AddMedication')}
          >
            <Text style={styles.emptyAddButtonText}>Agregar medicamento</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MedicationCard
              medication={item}
              onAdminister={handleAdminister}
              isAdministering={
                administerMedication.isPending &&
                administerMedication.variables?.id === item.id
              }
            />
          )}
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
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  iconCircleDone: {
    backgroundColor: '#87A96B',
  },
  cardContent: {
    flex: 1,
  },
  medName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 2,
  },
  medDosage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeBadgeText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  instructions: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  doseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doseStatusText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  doseStatusDone: {
    color: '#87A96B',
  },
  stockText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  adminButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  adminButtonDone: {
    backgroundColor: '#E5E7EB',
  },
  adminButtonPressed: {
    opacity: 0.75,
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  adminButtonTextDone: {
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
