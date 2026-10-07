import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const MedicationWidgetCard: React.FC<Props> = ({ widget }) => {
  const isCreation = widget.type === 'medication_created';

  if (isCreation) {
    const { name, dosage, frequency, times, instructions } = widget.data || {};
    const timesStr = Array.isArray(times) ? times.join(', ') : times || '08:00';

    return (
      <View style={[styles.card, styles.createdCard]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, styles.createdIcon]}>
              <Ionicons name="medical" size={18} color="#2D6A4F" />
            </View>
            <Text style={[styles.headerTitle, styles.createdTitle]}>
              {widget.title || 'Medicamento en Horario'}
            </Text>
          </View>
          <Text style={styles.activeBadge}>Activo</Text>
        </View>

        <Text style={styles.medName}>💊 {name || 'Medicamento'}</Text>

        {dosage ? (
          <Text style={styles.detailText}>
            Dosis: <Text style={styles.boldText}>{dosage}</Text>
          </Text>
        ) : null}

        {frequency ? (
          <Text style={styles.detailText}>
            Frecuencia: <Text style={styles.boldText}>{frequency}</Text>
          </Text>
        ) : null}

        {timesStr ? (
          <Text style={styles.detailText}>
            Horarios: <Text style={styles.boldText}>{timesStr}</Text>
          </Text>
        ) : null}

        {instructions ? (
          <Text style={styles.instructionsText}>📝 {instructions}</Text>
        ) : null}
      </View>
    );
  }

  const { medicationName, dosage, skipped, skipReason, givenByName, givenAt, stockRemaining } = widget.data || {};

  const timeStr = givenAt
    ? new Date(givenAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : 'Hoy';

  const isSkipped = Boolean(skipped);

  return (
    <View style={[styles.card, isSkipped ? styles.skippedCard : styles.successCard]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isSkipped ? styles.skippedIcon : styles.successIcon]}>
            <Ionicons
              name={isSkipped ? 'alert-circle' : 'checkmark-circle'}
              size={18}
              color={isSkipped ? '#D97706' : '#2D6A4F'}
            />
          </View>
          <Text style={[styles.headerTitle, isSkipped ? styles.skippedTitle : styles.successTitle]}>
            {widget.title || (isSkipped ? 'Dosis Omitida' : 'Dosis Registrada')}
          </Text>
        </View>
        <Text style={styles.timeText}>{timeStr}</Text>
      </View>

      <Text style={styles.medName}>💊 {medicationName || 'Medicamento'}</Text>

      {dosage ? (
        <Text style={styles.detailText}>
          Dosis: <Text style={styles.boldText}>{dosage}</Text>
        </Text>
      ) : null}

      {givenByName ? (
        <Text style={styles.subDetailText}>
          Registrado por: <Text style={styles.boldText}>{givenByName}</Text>
        </Text>
      ) : null}

      {stockRemaining !== null && stockRemaining !== undefined ? (
        <Text style={styles.subDetailText}>
          Stock restante: <Text style={styles.boldText}>{stockRemaining} unidades</Text>
        </Text>
      ) : null}

      {isSkipped && skipReason ? (
        <Text style={styles.reasonText}>Motivo: {skipReason}</Text>
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
    gap: 4,
  },
  successCard: {
    backgroundColor: '#F0F9F5',
    borderColor: '#C6EAD9',
  },
  createdCard: {
    backgroundColor: '#F4F9F4',
    borderColor: '#B7E4C7',
  },
  skippedCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  createdIcon: {
    backgroundColor: '#D8F3DC',
  },
  createdTitle: {
    color: '#2D6A4F',
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D6A4F',
    backgroundColor: '#D8F3DC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
    flexShrink: 0,
  },
  instructionsText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  successIcon: {
    backgroundColor: '#D8F3DC',
  },
  skippedIcon: {
    backgroundColor: '#FEF3C7',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  successTitle: {
    color: '#1B4332',
  },
  skippedTitle: {
    color: '#92400E',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B1A',
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
  },
  subDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '600',
    color: '#1F2937',
  },
  reasonText: {
    fontSize: 12,
    color: '#B45309',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
