import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useExpenses, usePaySplit } from '../../hooks/useExpenses';
import type { Expense, ExpenseCategory, ExpenseSplit } from '../../types/expense';
import type { FamiliaStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'Gastos'>;

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  medications: 'Medicamentos',
  medical: 'Médico',
  food: 'Alimentación',
  transport: 'Transporte',
  hygiene: 'Higiene',
  equipment: 'Equipamiento',
  other: 'Otro',
};

const CATEGORY_ICONS: Record<ExpenseCategory, React.ComponentProps<typeof Ionicons>['name']> = {
  medications: 'medical-outline',
  medical: 'medkit-outline',
  food: 'restaurant-outline',
  transport: 'car-outline',
  hygiene: 'water-outline',
  equipment: 'construct-outline',
  other: 'receipt-outline',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: string, currency: string): string {
  return `${currency} ${parseFloat(amount).toFixed(2)}`;
}

function SplitRow({
  split,
  expenseId,
}: {
  split: ExpenseSplit;
  expenseId: string;
}) {
  const paySplit = usePaySplit();

  function handlePay() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Marcar el pago de ${split.member.name} como pagado?`);
      if (confirmed) {
        paySplit.mutate({ expenseId, splitId: split.id });
      }
      return;
    }

    Alert.alert(
      'Confirmar pago',
      `¿Marcar el pago de ${split.member.name} como pagado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => paySplit.mutate({ expenseId, splitId: split.id }),
        },
      ],
    );
  }

  return (
    <View style={styles.splitRow}>
      <View style={styles.splitLeft}>
        <View style={[styles.splitDot, split.isPaid && styles.splitDotPaid]} />
        <Text style={styles.splitMember}>{split.member.name}</Text>
      </View>
      <View style={styles.splitRight}>
        <Text style={[styles.splitAmount, split.isPaid && styles.splitAmountPaid]}>
          {parseFloat(split.amount).toFixed(2)}
        </Text>
        {!split.isPaid ? (
          <Pressable
            style={({ pressed }) => [styles.payButton, pressed && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={paySplit.isPending}
            accessibilityLabel={`Marcar pago de ${split.member.name}`}
          >
            {paySplit.isPending && paySplit.variables?.splitId === split.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>Pagar</Text>
            )}
          </Pressable>
        ) : (
          <Ionicons name="checkmark-circle" size={20} color="#87A96B" />
        )}
      </View>
    </View>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  const [expanded, setExpanded] = React.useState(false);
  const icon = CATEGORY_ICONS[expense.category];
  const pendingSplits = expense.splits.filter((s) => !s.isPaid).length;
  const totalSplits = expense.splits.length;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}
      onPress={() => setExpanded((v) => !v)}
      accessibilityLabel={`Gasto: ${expense.title}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={20} color="#D4856A" />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {expense.title}
            </Text>
            <Text style={styles.cardAmount}>{formatAmount(expense.amount, expense.currency)}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Ionicons name="person-outline" size={13} color="#9CA3AF" />
            <Text style={styles.metaText}>Pagó: {expense.paidBy.name}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
            <Text style={styles.metaText}>{formatDate(expense.date)}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{CATEGORY_LABELS[expense.category]}</Text>
            </View>
            {totalSplits > 0 && (
              <Text style={[styles.splitsStatus, pendingSplits > 0 && styles.splitsStatusPending]}>
                {pendingSplits > 0 ? `${pendingSplits} pendiente(s)` : 'Todo pagado'}
              </Text>
            )}
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#9CA3AF"
          style={styles.expandIcon}
        />
      </View>

      {expanded && expense.splits.length > 0 && (
        <View style={styles.splitsContainer}>
          <Text style={styles.splitsTitle}>División del gasto</Text>
          {expense.splits.map((split) => (
            <SplitRow key={split.id} split={split} expenseId={expense.id} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export function ExpensesScreen() {
  const navigation = useNavigation<NavProp>();
  const { data, isLoading, error, refetch } = useExpenses();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#D4856A" />
        <Text style={styles.loadingText}>Cargando gastos...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar los gastos</Text>
        <Text style={styles.errorSub}>Revisa tu conexión e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const expenses = data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#2C2C2C" />
        </Pressable>
        <Text style={styles.headerTitle}>Gastos</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddGasto')}
          accessibilityLabel="Registrar gasto"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#D4856A" />
        </Pressable>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          expenses.length === 0
            ? [styles.listContent, { flexGrow: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin gastos registrados</Text>
            <Text style={styles.emptySub}>Registra los gastos del cuidado y divídelos entre la familia</Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddGasto')}
            >
              <Text style={styles.emptyAddButtonText}>Registrar gasto</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4856A"]}
            tintColor="#D4856A"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4856A',
    flexShrink: 0,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  categoryChip: {
    backgroundColor: '#FDF0EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4856A',
  },
  splitsStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#87A96B',
  },
  splitsStatusPending: {
    color: '#F4B860',
  },
  expandIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  splitsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  splitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F4B860',
  },
  splitDotPaid: {
    backgroundColor: '#87A96B',
  },
  splitMember: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  splitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  splitAmountPaid: {
    color: '#87A96B',
  },
  payButton: {
    height: 30,
    paddingHorizontal: 12,
    backgroundColor: '#D4856A',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  retryButton: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  emptySub: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyAddButton: {
    marginTop: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
