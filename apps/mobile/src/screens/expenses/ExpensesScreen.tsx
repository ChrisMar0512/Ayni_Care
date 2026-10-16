import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useExpenses, usePaySplit } from '../../hooks/useExpenses';
import type { Expense, ExpenseCategory, ExpenseSplit } from '../../types/expense';
import type { FamiliaStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'Gastos'>;

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  medications: 'Medicamentos',
  medical: 'Consultas Médicas',
  food: 'Alimentación / Dieta',
  transport: 'Transporte / Traslado',
  hygiene: 'Higiene y Cuidado',
  equipment: 'Equipamiento Médico',
  other: 'Otros Gastos',
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

function formatAmount(amount: string | number, currency: string = '$'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  return `${currency} ${isNaN(num) ? '0.00' : num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SplitRow({
  split,
  expenseId,
  currency,
}: {
  split: ExpenseSplit;
  expenseId: string;
  currency: string;
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
      `¿Deseas marcar la cuota de ${split.member.name} (${formatAmount(split.amount, currency)}) como liquidada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar pago',
          onPress: () => paySplit.mutate({ expenseId, splitId: split.id }),
        },
      ],
    );
  }

  const isPendingMutation = paySplit.isPending && paySplit.variables?.splitId === split.id;

  return (
    <View style={[styles.splitRow, split.isPaid && styles.splitRowPaid]}>
      <View style={styles.splitLeft}>
        <View style={[styles.splitDot, split.isPaid ? styles.splitDotPaid : styles.splitDotPending]} />
        <View>
          <Text style={styles.splitMember}>{split.member.name}</Text>
          <Text style={styles.splitSubtext}>
            {split.isPaid ? 'Cuota saldada' : 'Pendiente de reembolso'}
          </Text>
        </View>
      </View>
      <View style={styles.splitRight}>
        <Text style={[styles.splitAmount, split.isPaid && styles.splitAmountPaid]}>
          {formatAmount(split.amount, currency)}
        </Text>
        {!split.isPaid ? (
          <Pressable
            style={({ pressed }) => [styles.payButton, pressed && { opacity: 0.8 }]}
            onPress={handlePay}
            disabled={isPendingMutation}
            accessibilityLabel={`Confirmar pago de ${split.member.name}`}
            hitSlop={6}
          >
            {isPendingMutation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Liquidar</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#2D6A4F" />
            <Text style={styles.paidBadgeText}>Pagado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  const [expanded, setExpanded] = React.useState(false);
  const icon = CATEGORY_ICONS[expense.category] || 'receipt-outline';
  const pendingSplits = expense.splits.filter((s) => !s.isPaid).length;
  const totalSplits = expense.splits.length;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.cardPressable}
        onPress={() => setExpanded((v) => !v)}
        accessibilityLabel={`Gasto: ${expense.title}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={22} color="#D4856A" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {expense.title}
              </Text>
              <Text style={styles.cardAmount}>{formatAmount(expense.amount, expense.currency)}</Text>
            </View>

            <View style={styles.cardMeta}>
              <Ionicons name="person-circle-outline" size={15} color="#6B7280" />
              <Text style={styles.metaText}>
                Pagó: <Text style={styles.metaBold}>{expense.paidBy.name}</Text>
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{formatDate(expense.date)}</Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{CATEGORY_LABELS[expense.category] || expense.category}</Text>
              </View>
              {totalSplits > 0 && (
                <View style={[styles.splitsStatusChip, pendingSplits > 0 ? styles.splitsPendingChip : styles.splitsDoneChip]}>
                  <Ionicons
                    name={pendingSplits > 0 ? 'time-outline' : 'checkmark-circle-outline'}
                    size={14}
                    color={pendingSplits > 0 ? '#B45309' : '#2D6A4F'}
                  />
                  <Text style={[styles.splitsStatusText, pendingSplits > 0 ? styles.splitsPendingText : styles.splitsDoneText]}>
                    {pendingSplits > 0 ? `${pendingSplits} de ${totalSplits} pendientes` : 'Todo liquidado'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#9CA3AF"
            style={styles.expandIcon}
          />
        </View>
      </Pressable>

      {/* Expanded Split Breakdown */}
      {expanded && (
        <View style={styles.splitsContainer}>
          <View style={styles.splitsHeaderRow}>
            <Text style={styles.splitsTitle}>División familiar ({totalSplits} miembros)</Text>
            <Text style={styles.splitsHelpText}>Toca "Liquidar" al recibir el reembolso</Text>
          </View>
          {expense.splits.length > 0 ? (
            expense.splits.map((split) => (
              <SplitRow
                key={split.id}
                split={split}
                expenseId={expense.id}
                currency={expense.currency}
              />
            ))
          ) : (
            <Text style={styles.noSplitsText}>Este gasto no fue dividido entre otros miembros.</Text>
          )}
        </View>
      )}
    </View>
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
        <Text style={styles.loadingText}>Cargando gastos familiares...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar los gastos</Text>
        <Text style={styles.errorSub}>Revisa tu conexión a internet e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const expenses = data ?? [];

  // Financial Summary Metrics
  const totalSpent = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const allSplits = expenses.flatMap((e) => e.splits);
  const pendingSplits = allSplits.filter((s) => !s.isPaid);
  const pendingAmount = pendingSplits.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver al inicio"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Gastos Compartidos</Text>
          <Text style={styles.headerSubtitle}>Transparencia de cuidado familiar</Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddGasto')}
          accessibilityLabel="Registrar nuevo gasto"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
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
        ListHeaderComponent={
          expenses.length > 0 ? (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <View style={styles.summaryBadge}>
                    <Ionicons name="wallet-outline" size={15} color="#D4856A" />
                    <Text style={styles.summaryBadgeText}>RESUMEN DEL CUIDADO</Text>
                  </View>
                  <Text style={styles.summaryCountText}>{expenses.length} gastos</Text>
                </View>

                <View style={styles.summaryMetricsRow}>
                  <View style={styles.summaryMetricItem}>
                    <Text style={styles.summaryMetricLabel}>Total acumulado</Text>
                    <Text style={styles.summaryMetricValue} numberOfLines={1}>
                      {formatAmount(totalSpent)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryMetricItem}>
                    <Text style={styles.summaryMetricLabel}>Por liquidar</Text>
                    <Text style={[styles.summaryMetricValue, styles.summaryPendingValue]} numberOfLines={1}>
                      {formatAmount(pendingAmount)}
                    </Text>
                  </View>
                </View>

                {pendingSplits.length > 0 ? (
                  <View style={styles.summaryPendingNotice}>
                    <Ionicons name="information-circle-outline" size={15} color="#B45309" />
                    <Text style={styles.summaryNoticeText}>
                      Hay {pendingSplits.length} división(es) familiar(es) pendiente(s) de pago.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.summaryAllPaidNotice}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#2D6A4F" />
                    <Text style={styles.summaryAllPaidText}>
                      ¡Excelente! Todas las divisiones están al día.
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.listSectionTitle}>Historial de gastos</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={48} color="#D4856A" />
            </View>
            <Text style={styles.emptyTitle}>Sin gastos registrados</Text>
            <Text style={styles.emptySub}>
              Anota medicinas, citas, transporte o insumos y repártelos equitativamente entre los familiares.
            </Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddGasto')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Registrar primer gasto</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D4856A']}
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
    paddingBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F3D9CF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF0EB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4856A',
    letterSpacing: 0.5,
  },
  summaryCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryMetricItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  summaryMetricLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  summaryPendingValue: {
    color: '#D4856A',
  },
  summaryPendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 12,
  },
  summaryNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  summaryAllPaidNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF4EC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 12,
  },
  summaryAllPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D6A4F',
    flex: 1,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DFD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardPressable: {
    borderRadius: 12,
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
    gap: 6,
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
    color: '#1F2937',
    lineHeight: 21,
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D4856A',
    flexShrink: 0,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    color: '#4B5563',
  },
  metaBold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  metaDot: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  splitsStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  splitsPendingChip: {
    backgroundColor: '#FEF3C7',
  },
  splitsDoneChip: {
    backgroundColor: '#EBF4EC',
  },
  splitsStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  splitsPendingText: {
    color: '#B45309',
  },
  splitsDoneText: {
    color: '#2D6A4F',
  },
  expandIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  splitsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  splitsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  splitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  splitsHelpText: {
    fontSize: 11,
    color: '#6B7280',
  },
  noSplitsText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  splitRowPaid: {
    backgroundColor: '#F9FDF9',
    borderColor: '#EBF4EC',
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  splitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  splitDotPending: {
    backgroundColor: '#F59E0B',
  },
  splitDotPaid: {
    backgroundColor: '#2D6A4F',
  },
  splitMember: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  splitSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  splitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  splitAmountPaid: {
    color: '#2D6A4F',
  },
  payButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: '#D4856A',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF4EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D6A4F',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 15,
    color: '#6B7280',
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
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptySub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddButton: {
    marginTop: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#D4856A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

