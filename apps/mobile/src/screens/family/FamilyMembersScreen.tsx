import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  FlatList,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamilyMembers, useRemoveMember } from '../../hooks/useFamily';
import { useAuthStore } from '../../stores/authStore';
import type { FamiliaStackParamList } from '../../navigation/types';
import type { MemberRole } from '@ayni-care/shared';

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'Miembros'>;

const ROLE_LABELS: Record<MemberRole, string> = {
  primary_caregiver: 'Cuidador Principal',
  remote_family: 'Familiar Remoto',
  weekend_helper: 'Ayudante de Fin de Semana',
  paid_caregiver: 'Cuidador Contratado',
};

const ROLE_COLORS: Record<MemberRole, { bg: string; text: string; icon: string }> = {
  primary_caregiver: { bg: '#FDF0EB', text: '#D4856A', icon: 'ribbon-outline' },
  remote_family: { bg: '#F0F7EB', text: '#87A96B', icon: 'people-outline' },
  weekend_helper: { bg: '#EFF6FF', text: '#3B82F6', icon: 'calendar-outline' },
  paid_caregiver: { bg: '#FAF5FF', text: '#8B5CF6', icon: 'briefcase-outline' },
};

export function FamilyMembersScreen() {
  const navigation = useNavigation<NavProp>();
  const currentMember = useAuthStore((s) => s.member);
  const currentUser = useAuthStore((s) => s.user);
  const { data: members, isLoading, error, refetch } = useFamilyMembers();
  const removeMember = useRemoveMember();

  const isPrimaryCaregiver = currentMember?.role === 'primary_caregiver';

  function handleRemoveMember(id: string, name: string) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `¿Estás seguro de que deseas eliminar a ${name} de la familia? Ya no tendrá acceso a la información del paciente.`
      );
      if (confirmed) {
        removeMember.mutate(id, {
          onSuccess: () => {
            alert(`${name} ha sido eliminado de la familia.`);
          },
          onError: () => {
            alert('No se pudo eliminar al miembro. Intenta de nuevo.');
          },
        });
      }
      return;
    }

    Alert.alert(
      'Eliminar miembro',
      `¿Estás seguro de que deseas eliminar a ${name} de la familia? Ya no tendrá acceso a la información del paciente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeMember.mutate(id, {
              onSuccess: () => {
                Alert.alert('Éxito', `${name} ha sido eliminado de la familia.`);
              },
              onError: () => {
                Alert.alert('Error', 'No se pudo eliminar al miembro. Intenta de nuevo.');
              },
            });
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#D4856A" />
        <Text style={styles.loadingText}>Cargando miembros...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#D4856A" />
        <Text style={styles.errorTitle}>No se pudieron cargar los miembros</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Miembros de la familia</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('InvitarMiembro')}
          accessibilityLabel="Invitar miembro"
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#D4856A" />
        </Pressable>
      </View>

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const style = ROLE_COLORS[item.role] || { bg: '#F3F4F6', text: '#4B5563', icon: 'person-outline' };
          const isCurrentUser = item.id === currentMember?.id || (item.userId !== undefined && item.userId === currentUser?.id);
          const canDelete = isPrimaryCaregiver && !isCurrentUser;

          return (
            <View style={styles.card}>
              <View style={[styles.avatarCircle, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon as any} size={22} color={style.text} />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isCurrentUser && (
                    <View style={styles.meBadge}>
                      <Text style={styles.meBadgeText}>Tú</Text>
                    </View>
                  )}
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.email || item.phone || 'Sin datos de contacto'}
                  </Text>
                </View>

                <View style={[styles.roleBadge, { backgroundColor: style.bg }]}>
                  <Text style={[styles.roleBadgeText, { color: style.text }]}>
                    {ROLE_LABELS[item.role]}
                  </Text>
                </View>
              </View>

              {canDelete && (
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleRemoveMember(item.id, item.name)}
                  accessibilityLabel={`Eliminar a ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No hay miembros</Text>
            <Text style={styles.emptySub}>Invita a miembros de tu familia para coordinar el cuidado</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.inviteBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => navigation.navigate('InvitarMiembro')}
          accessibilityLabel="Invitar nuevo miembro"
        >
          <Ionicons name="mail-open-outline" size={20} color="#fff" />
          <Text style={styles.inviteBtnText}>Invitar nuevo miembro</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
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
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    flexShrink: 1,
  },
  meBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  meBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
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
    paddingHorizontal: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(248, 245, 240, 0.95)',
  },
  inviteBtn: {
    height: 52,
    backgroundColor: '#D4856A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#D4856A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
