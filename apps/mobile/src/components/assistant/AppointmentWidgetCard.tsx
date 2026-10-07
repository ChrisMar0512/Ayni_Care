import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const AppointmentWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, doctorName, location, scheduledAt } = widget.data || {};

  const formattedDate = scheduledAt
    ? new Date(scheduledAt).toLocaleString('es-PE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Fecha por definir';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar" size={18} color="#4F46E5" />
          </View>
          <Text style={styles.headerTitle}>
            {widget.title || 'Cita Agendada en Calendario'}
          </Text>
        </View>
      </View>

      <Text style={styles.appointmentTitle}>🩺 {title || 'Cita Médica'}</Text>

      <View style={styles.detailRow}>
        <Ionicons name="time-outline" size={16} color="#6B7280" />
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {doctorName ? (
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Especialista: <Text style={styles.boldText}>{doctorName}</Text>
          </Text>
        </View>
      ) : null}

      {location ? (
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{location}</Text>
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
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#312E81',
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '600',
    color: '#1F2937',
  },
});
