import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const NoteWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, content, authorName, createdAt } = widget.data || {};

  const timeStr = createdAt
    ? new Date(createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : 'Hoy';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="document-text-outline" size={18} color="#87A96B" />
          </View>
          <Text style={styles.headerTitle}>
            {widget.title || 'Nota de Cuidado Guardada'}
          </Text>
        </View>
        <Text style={styles.timeText}>{timeStr}</Text>
      </View>

      {title ? <Text style={styles.noteTitle}>📝 {title}</Text> : null}

      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>"{content}"</Text>
      </View>

      {authorName ? (
        <Text style={styles.authorText}>
          Registrado por: <Text style={styles.boldText}>{authorName}</Text>
        </Text>
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
    backgroundColor: '#F0F7EB',
    borderColor: '#D4E8C8',
    gap: 4,
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
    backgroundColor: '#E2F0D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B6B32',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  quoteBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2F0D9',
    marginVertical: 4,
  },
  quoteText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  authorText: {
    fontSize: 12,
    color: '#6B7280',
  },
  boldText: {
    fontWeight: '600',
    color: '#1F2937',
  },
});
