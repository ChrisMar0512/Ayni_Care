import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotes, useDeleteNote } from '../../hooks/useNotes';
import type { Note, NoteType } from '../../types/note';
import type { FamiliaStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'Notas'>;

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  general: 'General',
  medical: 'Médica',
  handoff: 'Entrega de turno',
  symptom: 'Síntoma',
  observation: 'Observación',
};

const NOTE_TYPE_COLORS: Record<NoteType, { bg: string; text: string }> = {
  general: { bg: '#F3F4F6', text: '#6B7280' },
  medical: { bg: '#EFF6FF', text: '#3B82F6' },
  handoff: { bg: '#F0FDF4', text: '#22C55E' },
  symptom: { bg: '#FEF2F2', text: '#EF4444' },
  observation: { bg: '#FFF7ED', text: '#F97316' },
};

const FILTER_OPTIONS: Array<{ value: NoteType | 'all'; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'general', label: 'General' },
  { value: 'medical', label: 'Médica' },
  { value: 'handoff', label: 'Turno' },
  { value: 'symptom', label: 'Síntoma' },
  { value: 'observation', label: 'Obs.' },
];

function formatRelativeDate(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 1) return 'Hace menos de 1h';
  if (diffHours < 24) return `Hace ${Math.floor(diffHours)}h`;
  if (diffDays < 2) return 'Ayer';
  if (diffDays < 7) return `Hace ${Math.floor(diffDays)} días`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: (id: string) => void }) {
  const typeStyle = NOTE_TYPE_COLORS[note.type];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
          <Text style={[styles.typeText, { color: typeStyle.text }]}>
            {NOTE_TYPE_LABELS[note.type]}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatRelativeDate(note.createdAt)}</Text>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
          onPress={() => onDelete(note.id)}
          accessibilityLabel="Eliminar nota"
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
        </Pressable>
      </View>

      {note.title ? (
        <Text style={styles.noteTitle} numberOfLines={2}>
          {note.title}
        </Text>
      ) : null}

      <Text style={styles.noteContent} numberOfLines={4}>
        {note.content}
      </Text>

      <View style={styles.authorRow}>
        <Ionicons name="person-outline" size={13} color="#9CA3AF" />
        <Text style={styles.authorText}>{note.author.name}</Text>
      </View>
    </View>
  );
}

export function NotesScreen() {
  const navigation = useNavigation<NavProp>();
  const [activeFilter, setActiveFilter] = useState<NoteType | 'all'>('all');
  const { data, isLoading, error, refetch } = useNotes(
    activeFilter !== 'all' ? activeFilter : undefined,
  );
  const deleteNote = useDeleteNote();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleDelete(id: string) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Seguro que quieres eliminar esta nota?');
      if (confirmed) {
        deleteNote.mutate(id);
      }
      return;
    }

    Alert.alert('Eliminar nota', '¿Seguro que quieres eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteNote.mutate(id),
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#D4856A" />
        <Text style={styles.loadingText}>Cargando notas...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar las notas</Text>
        <Text style={styles.errorSub}>Revisa tu conexión e intenta de nuevo</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const notes = data ?? [];

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
        <Text style={styles.headerTitle}>Notas médicas</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('AddNota')}
          accessibilityLabel="Agregar nota"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#D4856A" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={({ pressed }) => [
              styles.filterChip,
              activeFilter === opt.value && styles.filterChipActive,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => setActiveFilter(opt.value)}
            accessibilityLabel={`Filtrar: ${opt.label}`}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          notes.length === 0
            ? [styles.listContent, { flexGrow: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin notas</Text>
            <Text style={styles.emptySub}>
              {activeFilter !== 'all'
                ? `No hay notas de tipo "${NOTE_TYPE_LABELS[activeFilter]}"`
                : 'Registra observaciones y entrega de turno entre cuidadores'}
            </Text>
            {activeFilter === 'all' && (
              <Pressable
                style={styles.emptyAddButton}
                onPress={() => navigation.navigate('AddNota')}
              >
                <Text style={styles.emptyAddButtonText}>Nueva nota</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => <NoteCard note={item} onDelete={handleDelete} />}
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
  filterBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#D4856A',
    borderColor: '#D4856A',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
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
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  noteContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorText: {
    fontSize: 13,
    color: '#9CA3AF',
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
