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

  // Configuración visual según el tipo de ítem
  let typeIcon: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';
  let typeBadgeBg = '#F3F4F6';
  let typeBadgeColor = '#4B5563';
  let typeLabel = 'Actividad';

  if (item.type === 'medication') {
    typeIcon = 'medical';
    typeBadgeBg = '#FDF0EB';
    typeBadgeColor = '#D4856A';
    typeLabel = 'Medicina';
  } else if (item.type === 'appointment') {
    typeIcon = 'calendar';
    typeBadgeBg = '#EFF6FF';
    typeBadgeColor = '#3B82F6';
    typeLabel = 'Cita médica';
  }

  const handleCheckPress = () => {
    if (!isPending || isActionPending) return;
    if (item.type === 'medication') {
      onCompleteMedication(item.originalId, item.time || '');
    } else {
      onCompleteActivity(item.originalId);
    }
  };

  return (
    <View
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        isSkipped && styles.cardSkipped,
        item.priority === 'urgent' && isPending && styles.cardUrgent,
      ]}
    >
      <View style={styles.cardMain}>
        {/* Botón táctil grande de completar (mínimo 48x48px accesible) */}
        <Pressable
          style={({ pressed }) => [
            styles.checkButton,
            isPending ? styles.checkPending : isSkipped ? styles.checkSkippedBtn : styles.checkDoneBtn,
            pressed && styles.checkPressed,
          ]}
          onPress={handleCheckPress}
          disabled={!isPending || isActionPending}
          accessibilityLabel={isPending ? `Marcar ${item.title} como completado` : `Tarea completada: ${item.title}`}
          hitSlop={6}
        >
          {isActionPending ? (
            <ActivityIndicator size="small" color={isPending ? '#D4856A' : '#FFFFFF'} />
          ) : isPending ? (
            <View style={styles.ringUnchecked} />
          ) : isSkipped ? (
            <Ionicons name="close" size={22} color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          )}
        </Pressable>

        {/* Información de la actividad */}
        <View style={styles.infoContainer}>
          {/* Fila de tipo y hora */}
          <View style={styles.topRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeBadgeBg }]}>
              <Ionicons name={typeIcon} size={13} color={typeBadgeColor} />
              <Text style={[styles.typeBadgeText, { color: typeBadgeColor }]}>{typeLabel}</Text>
            </View>

            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.timeBadgeText}>
                {item.time ? item.time : 'Durante el día'}
              </Text>
            </View>

            {item.priority === 'urgent' && isPending && (
              <View style={styles.urgentBadge}>
                <Ionicons name="alert-circle" size={12} color="#DC2626" />
                <Text style={styles.urgentText}>Urgente</Text>
              </View>
            )}
          </View>

          {/* Título de la tarea */}
          <Text
            style={[
              styles.title,
              !isPending && styles.titleCompleted,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Subtítulo / dosis / notas */}
          {item.subtitle ? (
            <Text style={[styles.subtitle, !isPending && styles.textMuted]} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}

          {/* Estado de completado con autor y hora */}
          {!isPending && (
            <View style={styles.completedStatusRow}>
              <Ionicons
                name={isSkipped ? 'alert-circle' : 'checkmark-circle'}
                size={14}
                color={isSkipped ? '#EF4444' : '#87A96B'}
              />
              <Text style={[styles.completedStatusText, isSkipped && styles.skippedStatusText]}>
                {isSkipped ? 'Omitido' : 'Completado'}
                {item.completedBy ? ` por ${item.completedBy.name}` : ''}
                {item.completedAt
                  ? ` · ${new Date(item.completedAt).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}`
                  : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardCompleted: {
    backgroundColor: '#FAF9F6',
    borderColor: '#E5E7EB',
    opacity: 0.88,
  },
  cardSkipped: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardUrgent: {
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  checkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  ringUnchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D4856A',
  },
  checkDoneBtn: {
    backgroundColor: '#87A96B',
    borderWidth: 0,
  },
  checkSkippedBtn: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
  },
  checkPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 22,
  },
  titleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: 1,
  },
  textMuted: {
    color: '#9CA3AF',
  },
  completedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  completedStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#87A96B',
  },
  skippedStatusText: {
    color: '#EF4444',
  },
});
