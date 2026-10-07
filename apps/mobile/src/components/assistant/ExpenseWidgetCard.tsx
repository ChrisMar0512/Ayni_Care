import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const ExpenseWidgetCard: React.FC<Props> = ({ widget }) => {
  const { title, amount, currency = 'PEN', paidBy, splits = [] } = widget.data || {};

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="wallet-outline" size={18} color="#D4856A" />
          </View>
          <Text style={styles.headerTitle}>
            {widget.title || 'Gasto Registrado'}
          </Text>
        </View>
        <Text style={styles.amountText}>
          {currency === 'PEN' ? 'S/.' : '$'} {Number(amount || 0).toFixed(2)}
        </Text>
      </View>

      <Text style={styles.expenseTitle}>🛒 {title || 'Gasto del cuidado'}</Text>

      {paidBy ? (
        <Text style={styles.paidByText}>
          Pagado por: <Text style={styles.boldText}>{paidBy}</Text>
        </Text>
      ) : null}

      {splits.length > 0 ? (
        <View style={styles.splitsDivider}>
          <Text style={styles.splitsHeader}>División entre familiares:</Text>
          {splits.map((s: any, idx: number) => (
            <View key={idx} style={styles.splitRow}>
              <Text style={styles.memberName}>• {s.name}</Text>
              <Text style={styles.splitAmount}>
                {currency === 'PEN' ? 'S/.' : '$'} {Number(s.amount).toFixed(2)}{' '}
                <Text style={s.isPaid ? styles.paidBadge : styles.pendingBadge}>
                  ({s.isPaid ? 'Cubierto' : 'Pendiente'})
                </Text>
              </Text>
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
    backgroundColor: '#FDF0EB',
    borderColor: '#F8D7CC',
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
    backgroundColor: '#FADCCE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C3D24',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4856A',
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  paidByText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '600',
    color: '#1F2937',
  },
  splitsDivider: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5C6B5',
    gap: 4,
  },
  splitsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C3D24',
    marginBottom: 2,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  memberName: {
    fontSize: 13,
    color: '#4B5563',
  },
  splitAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  paidBadge: {
    color: '#2D6A4F',
    fontWeight: '700',
  },
  pendingBadge: {
    color: '#D97706',
    fontWeight: '600',
  },
});
