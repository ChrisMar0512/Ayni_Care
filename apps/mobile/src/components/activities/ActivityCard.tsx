import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '../../types/activity';

interface ActivityCardProps {
  activity: Activity;
  onComplete: (id: string) => void;
  isCompleting?: boolean;
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function ActivityCard({ activity, onComplete, isCompleting }: ActivityCardProps) {
  const isPending = activity.status === 'pending';
  const time = formatTime(activity.scheduledAt);

  return (
    <View style={[styles.card, !isPending && styles.cardCompleted]}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [
            styles.checkButton,
            isPending ? styles.checkPending : styles.checkDone,
            pressed && styles.checkPressed,
          ]}
          onPress={() => isPending && onComplete(activity.id)}
          disabled={!isPending || isCompleting}
          accessibilityLabel={isPending ? 'Completar actividad' : 'Actividad completada'}
          hitSlop={8}
        >
          {isCompleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isPending ? 'checkmark' : 'checkmark'}
              size={20}
              color={isPending ? '#9CA3AF' : '#fff'}
            />
          )}
        </Pressable>

        <View style={styles.content}>
          <Text
            style={[styles.title, !isPending && styles.titleCompleted]}
            numberOfLines={2}
          >
            {activity.title}
          </Text>

          <View style={styles.meta}>
            {time && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaText}>{time}</Text>
              </View>
            )}
            {activity.assignedTo && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaText}>{activity.assignedTo.name}</Text>
              </View>
            )}
          </View>

          {!isPending && activity.lastLog && (
            <Text style={styles.completedBy} numberOfLines={1}>
              Completado por {activity.lastLog.completedBy.name}
            </Text>
          )}
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
  },
  cardCompleted: {
    backgroundColor: '#FAFAF9',
    opacity: 0.85,
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
    backgroundColor: '#87A96B',
    borderColor: '#87A96B',
  },
  checkPressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 6,
  },
  titleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  completedBy: {
    fontSize: 12,
    color: '#87A96B',
    marginTop: 4,
  },
});
