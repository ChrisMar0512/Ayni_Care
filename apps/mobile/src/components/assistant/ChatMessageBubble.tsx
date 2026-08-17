import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantChatMessage } from '../../types/assistant';
import { MedicationWidgetCard } from './MedicationWidgetCard';
import { ActivityWidgetCard } from './ActivityWidgetCard';
import { ExpenseWidgetCard } from './ExpenseWidgetCard';
import { AppointmentWidgetCard } from './AppointmentWidgetCard';
import { NoteWidgetCard } from './NoteWidgetCard';
import { DailySummaryWidgetCard } from './DailySummaryWidgetCard';

interface Props {
  message: AssistantChatMessage;
}

export const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  const renderWidget = () => {
    if (!message.widget) return null;

    switch (message.widget.type) {
      case 'medication_dose_logged':
        return <MedicationWidgetCard widget={message.widget} />;
      case 'activity_created':
      case 'activity_completed':
        return <ActivityWidgetCard widget={message.widget} />;
      case 'expense_created':
        return <ExpenseWidgetCard widget={message.widget} />;
      case 'appointment_created':
        return <AppointmentWidgetCard widget={message.widget} />;
      case 'note_created':
        return <NoteWidgetCard widget={message.widget} />;
      case 'daily_summary':
        return <DailySummaryWidgetCard widget={message.widget} />;
      default:
        return null;
    }
  };

  const timeStr = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
          {timeStr ? <Text style={styles.userTime}>{timeStr}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      {/* Avatar de Ayni */}
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
      </View>

      <View style={styles.assistantContainer}>
        <View style={styles.assistantBubble}>
          <View style={styles.bubbleHeader}>
            <Text style={styles.senderName}>Ayni</Text>
            {timeStr && !message.isPending ? (
              <Text style={styles.assistantTime}>{timeStr}</Text>
            ) : null}
          </View>

          {message.isPending ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#D4856A" />
              <Text style={styles.loadingText}>Coordinando con la familia...</Text>
            </View>
          ) : (
            <Text style={styles.assistantText}>{message.content}</Text>
          )}

          {/* Renderizado de Widgets */}
          {renderWidget()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: '#D4856A',
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  userText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: '400',
  },
  userTime: {
    fontSize: 11,
    color: '#FDEEE9',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '400',
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 6,
    paddingHorizontal: 16,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assistantContainer: {
    maxWidth: '84%',
    flex: 1,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D4856A',
  },
  assistantTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  assistantText: {
    fontSize: 16,
    color: '#2C2C2C',
    lineHeight: 23,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
