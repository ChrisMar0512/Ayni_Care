import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const ActivityWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, priority, assignedTo, scheduledAt } = widget.data || {};
  const isCompleted = widget.type === 'activity_completed';

  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View style={[styles.card, isCompleted ? styles.completedCard : styles.pendingCard]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isCompleted ? styles.completedIcon : styles.pendingIcon]}>
            <Ionicons
              name={isCompleted ? 'checkbox' : 'list-outline'}
              size={18}
              color={isCompleted ? '#2D6A4F' : '#2563EB'}
            />
          </View>
          <Text style={[styles.headerTitle, isCompleted ? styles.completedTitle : styles.pendingTitle]}>
            {widget.title || (isCompleted ? 'Tarea Completada' : 'Tarea Creada')}
          </Text>
        </View>
        {timeStr ? <Text style={styles.timeText}>{timeStr}</Text> : null}
      </View>

      <Text style={styles.activityTitle}>📋 {title || 'Actividad'}</Text>

      {assignedTo ? (
        <Text style={styles.detailText}>
          Asignado a: <Text style={styles.boldText}>{assignedTo}</Text>
        </Text>
      ) : null}

      {priority && priority !== 'normal' ? (
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>
            Prioridad {priority === 'urgent' ? 'Urgente' : priority}
          </Text>
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
    gap: 4,
  },
  completedCard: {
    backgroundColor: '#F0F9F5',
    borderColor: '#C6EAD9',
  },
  pendingCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIcon: {
    backgroundColor: '#D8F3DC',
  },
  pendingIcon: {
    backgroundColor: '#DBEAFE',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  completedTitle: {
    color: '#1B4332',
  },
  pendingTitle: {
    color: '#1E40AF',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B1A',
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '600',
    color: '#1F2937',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    textTransform: 'uppercase',
  },
});
