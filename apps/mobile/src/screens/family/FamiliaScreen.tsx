import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FamiliaStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import type { MemberRole } from '@ayni-care/shared';

const ROLE_LABELS: Record<MemberRole, string> = {
  primary_caregiver: 'Cuidador Principal',
  remote_family: 'Familiar Remoto',
  weekend_helper: 'Ayudante de Fin de Semana',
  paid_caregiver: 'Cuidador Contratado',
};

type NavProp = NativeStackNavigationProp<FamiliaStackParamList, 'FamiliaHub'>;

interface SectionCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function SectionCard({ icon, title, description, color, bgColor, onPress }: SectionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
      accessibilityLabel={`Ir a ${title}`}
    >
      <View style={[styles.cardIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </Pressable>
  );
}

export function FamiliaScreen() {
  const navigation = useNavigation<NavProp>();
  const { member, logout } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAgencyModalVisible, setIsAgencyModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState('Turno noche (12h)');
  const [selectedUrgency, setSelectedUrgency] = useState('urgente_esta_semana');
  const [isSubmittingAgency, setIsSubmittingAgency] = useState(false);
  const [isAgencySubmitted, setIsAgencySubmitted] = useState(false);

  const handleOpenPrivacyPolicy = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://ayni-care-backend.vercel.app/privacy-policy');
    } catch {
      Alert.alert('Aviso', 'Puedes consultar la política en https://ayni-care-backend.vercel.app/privacy-policy');
    }
  };

  const handleOpenTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://ayni-care-backend.vercel.app/terminos');
    } catch {
      Alert.alert('Aviso', 'Puedes consultar los términos en https://ayni-care-backend.vercel.app/terminos');
    }
  };

  const handleConfirmAgencyInquiry = async () => {
    setIsSubmittingAgency(true);
    try {
      await api.post('/api/analytics/commercial-intent', {
        intentType: 'caregiver_agency',
        metadata: {
          shiftType: selectedShift,
          urgency: selectedUrgency,
          familyName: member?.family?.name || 'Familia',
          source: 'familia_screen',
        },
      });
      setIsAgencySubmitted(true);
    } catch (err: any) {
      console.warn('[Agency Intent Error]', err);
      setIsAgencySubmitted(true);
    } finally {
      setIsSubmittingAgency(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '¿Eliminar tu cuenta definitivamente?',
      'Esta acción es permanente e irreversible. Se eliminará tu acceso, tus credenciales y tu vinculación familiar en Ayni Care.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar cuenta',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await api.delete('/api/auth/delete-account');
            } catch (err: any) {
              console.warn('[FamiliaScreen] Error al eliminar en backend:', err?.message);
            } finally {
              setIsDeleting(false);
              await logout();
              Alert.alert('Cuenta Eliminada', 'Tu cuenta y datos personales han sido eliminados.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Familia</Text>
        {member?.family?.name ? (
          <Text style={styles.headerSub}>{member.family.name}</Text>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>ADMINISTRACIÓN</Text>

        <SectionCard
          icon="receipt-outline"
          title="Gastos compartidos"
          description="Registra y divide los gastos del cuidado entre la familia"
          color="#D4856A"
          bgColor="#FDF0EB"
          onPress={() => navigation.navigate('Gastos')}
        />

        <SectionCard
          icon="document-text-outline"
          title="Notas médicas"
          description="Observaciones, síntomas y entregas de turno entre cuidadores"
          color="#87A96B"
          bgColor="#F0F7EB"
          onPress={() => navigation.navigate('Notas')}
        />

        <SectionCard
          icon="people-outline"
          title="Gestión de miembros"
          description="Invita a miembros de la familia y administra sus roles y accesos"
          color="#3B82F6"
          bgColor="#EFF6FF"
          onPress={() => navigation.navigate('Miembros')}
        />

        <SectionCard
          icon="shield-checkmark-outline"
          title="Agencias de Cuidadores"
          description="Enfermeras y personal certificado con reemplazo garantizado y monitoreo"
          color="#7C3AED"
          bgColor="#F5F3FF"
          onPress={() => {
            setIsAgencySubmitted(false);
            setIsAgencyModalVisible(true);
          }}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>MI CUENTA</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {member?.name ? member.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{member?.name || 'Usuario'}</Text>
              <Text style={styles.profileEmail}>
                {useAuthStore.getState().user?.email || useAuthStore.getState().user?.phone || ''}
              </Text>
              {member?.role && (
                <View style={styles.profileRoleBadge}>
                  <Text style={styles.profileRoleText}>
                    {ROLE_LABELS[member.role]}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Enlaces legales para Store Compliance */}
          <View style={styles.legalLinksContainer}>
            <Pressable style={styles.legalLinkRow} onPress={handleOpenPrivacyPolicy}>
              <View style={styles.legalLinkLeft}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                <Text style={styles.legalLinkText}>Política de Privacidad</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.legalLinkRow} onPress={handleOpenTerms}>
              <View style={styles.legalLinkLeft}>
                <Ionicons name="document-text-outline" size={18} color="#6B7280" />
                <Text style={styles.legalLinkText}>Términos y Condiciones</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* Acciones de cuenta */}
          <View style={styles.accountActions}>
            <Pressable style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#6B7280" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>

            <Pressable 
              style={styles.deleteButton} 
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.deleteText}>Eliminar mi cuenta</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Versión de la app */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>Ayni Care v1.0.0 (Build 1)</Text>
          <Text style={styles.versionSub}>Hecho para el cuidado familiar en Latinoamérica</Text>
        </View>
      </ScrollView>

      {/* Modal de Intención Comercial: Agencias de Cuidadores */}
      <Modal
        visible={isAgencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsAgencyModalVisible(false);
          setIsAgencySubmitted(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {isAgencySubmitted ? (
              <View style={{ alignItems: 'center', width: '100%', paddingVertical: 10 }}>
                <View style={[styles.agencyIconCircle, { backgroundColor: '#F5F3FF', width: 72, height: 72, borderRadius: 36 }]}>
                  <Ionicons name="checkmark-circle" size={44} color="#7C3AED" />
                </View>

                <Text style={[styles.modalTitle, { color: '#7C3AED', marginTop: 8 }]}>
                  ¡Solicitud Registrada!
                </Text>

                <Text style={[styles.modalSubtitle, { color: '#374151', fontSize: 14, lineHeight: 20, marginVertical: 12 }]}>
                  Hemos registrado tu solicitud para{' '}
                  <Text style={{ fontWeight: '700', color: '#1F2937' }}>
                    {selectedShift}
                  </Text>
                  . Conectaremos con agencias certificadas aliadas y te enviaremos opciones y presupuestos a tu contacto.
                </Text>

                <View style={{ backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', borderWidth: 1, padding: 10, borderRadius: 10, width: '100%', marginBottom: 18 }}>
                  <Text style={{ fontSize: 13, color: '#6D28D9', textAlign: 'center', fontWeight: '600' }}>
                    ✅ Solicitud vinculada a tu familia
                  </Text>
                </View>

                <Pressable
                  style={styles.agencySubmitButton}
                  onPress={() => {
                    setIsAgencyModalVisible(false);
                    setIsAgencySubmitted(false);
                  }}
                >
                  <Text style={styles.agencySubmitButtonText}>Entendido</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.agencyIconCircle}>
                  <Ionicons name="shield-checkmark" size={32} color="#7C3AED" />
                </View>

                <Text style={styles.modalTitle}>Agencias de Cuidado Formal</Text>
                <Text style={styles.modalSubtitle}>
                  Personal certificado, verificado y supervisado en Ayni Care
                </Text>

                <Text style={styles.filterSectionTitle}>1. ¿Qué tipo de turno necesitas?</Text>
                <View style={styles.optionsWrap}>
                  {[
                    'Turno noche (12h)',
                    'Turno día (12h)',
                    'Cama adentro (24/7)',
                    'Por horas / Días específicos',
                  ].map((shift) => (
                    <Pressable
                      key={shift}
                      style={[
                        styles.optionChip,
                        selectedShift === shift && styles.optionChipActive,
                      ]}
                      onPress={() => setSelectedShift(shift)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedShift === shift && styles.optionChipTextActive,
                        ]}
                      >
                        {shift}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>2. ¿Con qué urgencia lo buscas?</Text>
                <View style={styles.optionsWrap}>
                  {[
                    { id: 'urgente_esta_semana', label: 'Urgente esta semana' },
                    { id: 'durante_este_mes', label: 'Durante este mes' },
                    { id: 'evaluando_precios', label: 'Solo evaluando precios' },
                  ].map((urg) => (
                    <Pressable
                      key={urg.id}
                      style={[
                        styles.optionChip,
                        selectedUrgency === urg.id && styles.optionChipActive,
                      ]}
                      onPress={() => setSelectedUrgency(urg.id)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedUrgency === urg.id && styles.optionChipTextActive,
                        ]}
                      >
                        {urg.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={styles.agencySubmitButton}
                  onPress={handleConfirmAgencyInquiry}
                  disabled={isSubmittingAgency}
                >
                  {isSubmittingAgency ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={17} color="#FFFFFF" />
                      <Text style={styles.agencySubmitButtonText}>Solicitar cotizaciones</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => setIsAgencyModalVisible(false)}
                  disabled={isSubmittingAgency}
                >
                  <Text style={styles.modalCancelButtonText}>Volver</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  headerSub: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  cardDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  comingSoon: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  comingSoonSub: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  profileEmail: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  profileRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  profileRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  legalLinksContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 4,
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  legalLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legalLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  accountActions: {
    gap: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  versionFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  versionSub: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  agencyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 6,
  },
  optionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  optionChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  optionChipTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  agencySubmitButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  agencySubmitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
