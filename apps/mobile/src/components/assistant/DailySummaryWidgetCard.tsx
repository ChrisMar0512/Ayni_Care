import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const DailySummaryWidgetCard: React.FC<Props> = ({ widget }) => {
  const { medications = [], activities = [], appointments = [] } = widget.data || {};

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="sunny" size={20} color="#D4856A" />
        </View>
        <Text style={styles.headerTitle}>
          {widget.title || 'Resumen del Día de Hoy'}
        </Text>
      </View>

      {/* Medicamentos */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>💊 Medicamentos ({medications.length})</Text>
        {medications.length === 0 ? (
          <Text style={styles.emptyText}>No hay medicamentos programados.</Text>
        ) : (
          medications.map((m: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemTitle}>• {m.name} ({m.dosage})</Text>
              <Text style={m.isFullyTaken ? styles.completeBadge : styles.pendingBadge}>
                {m.isFullyTaken ? '✅ Tomado' : `⏳ ${m.takenToday}/${m.times?.length || 1} tomas`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Actividades */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>📋 Tareas del Día ({activities.length})</Text>
        {activities.length === 0 ? (
          <Text style={styles.emptyText}>No hay tareas registradas.</Text>
        ) : (
          activities.map((a: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemTitle}>{a.title}</Text>
              <Text style={a.status === 'completed' ? styles.completeBadge : styles.pendingBadge}>
                {a.status === 'completed' ? 'Hecha' : 'Pendiente'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Citas */}
      {appointments.length > 0 ? (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>📅 Citas ({appointments.length})</Text>
          {appointments.map((app: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.appointmentText}>{app.title}</Text>
              {app.doctor ? <Text style={styles.doctorText}>Dr(a): {app.doctor}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FDFBF7',
    borderColor: '#EBDDC9',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E7D8',
    gap: 6,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C3D24',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C2C2C',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  completeBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
    flexShrink: 0,
  },
  pendingBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    flexShrink: 0,
  },
  appointmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C2C2C',
    flex: 1,
    flexShrink: 1,
  },
  doctorText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
