import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DashboardItem } from '../../hooks/useDashboard';

interface DashboardItemCardProps {
  item: DashboardItem;
  onCompleteActivity: (id: string) => void;
  onCompleteMedication: (id: string, timeSlot: string) => void;
  isActionPending?: boolean;
}

export function DashboardItemCard({
  item,
  onCompleteActivity,
  onCompleteMedication,
  isActionPending = false,
}: DashboardItemCardProps) {
  const isPending = item.status === 'pending';
  const isCompleted = item.status === 'completed';
  const isSkipped = item.status === 'skipped';

  // Determinar icono del tipo de ítem
  let typeIcon: keyof typeof Ionicons.glyphMap = 'checkbox-outline';
  let typeColor = '#2D6A4F';

  if (item.type === 'medication') {
    typeIcon = 'medkit-outline';
    typeColor = '#D4856A'; // Naranja/café cálido para medicamentos
  } else if (item.type === 'appointment') {
    typeIcon = 'calendar-outline';
    typeColor = '#4A90E2'; // Azul para citas médicas
  }

  // Manejar el clic en el botón de completar
  const handleCheckPress = () => {
    if (!isPending) return;
    if (item.type === 'medication') {
      onCompleteMedication(item.originalId, item.time);
    } else {
      onCompleteActivity(item.originalId);
    }
  };

  return (
    <View
      style={[
        styles.card,
        !isPending && styles.cardCompleted,
        item.priority === 'urgent' && styles.cardUrgent,
      ]}
    >
      <View style={styles.row}>
        {/* Botón de Checkmark */}
        <Pressable
          style={({ pressed }) => [
            styles.checkButton,
            isPending ? styles.checkPending : isSkipped ? styles.checkSkipped : styles.checkDone,
            pressed && styles.checkPressed,
          ]}
          onPress={handleCheckPress}
          disabled={!isPending || isActionPending}
          accessibilityLabel={isPending ? 'Marcar completado' : 'Completado'}
          hitSlop={8}
        >
          {isActionPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isPending ? 'checkmark' : isSkipped ? 'close' : 'checkmark'}
              size={20}
              color={isPending ? '#9CA3AF' : '#fff'}
            />
          )}
        </Pressable>

        {/* Contenido Principal */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.iconWrapper}>
              <Ionicons name={typeIcon} size={15} color={typeColor} />
            </View>
            <Text
              style={[
                styles.title,
                !isPending && styles.titleCompleted,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>

          {/* Subtítulo descriptivo */}
          {item.subtitle ? (
            <Text style={[styles.subtitle, !isPending && styles.titleCompleted]} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}

          {/* Fila de metadatos (Hora, Prioridad, etc.) */}
          <View style={styles.meta}>
            {item.time ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaText}>{item.time}</Text>
              </View>
            ) : (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaText}>Todo el día</Text>
              </View>
            )}

            {item.priority === 'urgent' ? (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>Urgente</Text>
              </View>
            ) : null}
          </View>

          {/* Estado de finalización */}
          {!isPending && (item.completedBy || item.completedAt) ? (
            <Text style={isSkipped ? styles.skippedBy : styles.completedBy} numberOfLines={1}>
              {isSkipped ? 'Omitido' : 'Completado'}
              {item.completedBy ? ` por ${item.completedBy.name}` : ''}
              {item.completedAt
                ? ` a las ${new Date(item.completedAt).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'America/Lima',
                  })}`
                : ''}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  cardCompleted: {
    backgroundColor: '#FAFAF9',
    opacity: 0.85,
    borderLeftColor: '#95D5B2',
  },
  cardUrgent: {
    borderLeftColor: '#EF4444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 2,
  },
  checkPending: {
    backgroundColor: '#fff',
    borderColor: '#D1D5DB',
  },
  checkDone: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  checkSkipped: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkPressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconWrapper: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2B1A',
    flex: 1,
  },
  titleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7C6B',
    marginBottom: 6,
    paddingLeft: 23,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingLeft: 23,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  completedBy: {
    fontSize: 12,
    color: '#2D6A4F',
    marginTop: 6,
    paddingLeft: 23,
    fontWeight: '500',
  },
  skippedBy: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    paddingLeft: 23,
    fontWeight: '500',
  },
});
