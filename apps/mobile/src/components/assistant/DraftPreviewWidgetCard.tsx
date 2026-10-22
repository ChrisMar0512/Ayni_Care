import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { AssistantWidget } from '../../types/assistant';
import api from '../../services/api';

interface Props {
  widget: AssistantWidget;
}

export const DraftPreviewWidgetCard: React.FC<Props> = ({ widget }) => {
  const queryClient = useQueryClient();
  const { actionType, entityTitle, fields = [], draftPayload, status: initialStatus } = widget.data || {};

  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(initialStatus === 'confirmed');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isConfirming || isConfirmed) return;
    setIsConfirming(true);
    setErrorMessage(null);

    try {
      await api.post('/api/assistant/confirm-action', {
        actionType,
        draftPayload,
      });

      setIsConfirmed(true);

      // Invalidar consultas relevantes para actualizar listas en tiempo real
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      console.error('[DraftPreviewWidgetCard] Error al confirmar:', err);
      const msg = err.response?.data?.error || 'No se pudo confirmar. Inténtalo de nuevo.';
      setErrorMessage(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <View style={[styles.card, isConfirmed ? styles.confirmedCard : styles.pendingCard]}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isConfirmed ? styles.confirmedIconBox : styles.pendingIconBox]}>
            <Ionicons
              name={isConfirmed ? 'checkmark-circle' : 'document-text'}
              size={18}
              color={isConfirmed ? '#2D6A4F' : '#D97706'}
            />
          </View>
          <Text style={[styles.headerTitle, isConfirmed ? styles.confirmedHeaderTitle : styles.pendingHeaderTitle]}>
            {isConfirmed ? 'Confirmado y Guardado' : 'Revisión Previa'}
          </Text>
        </View>

        <View style={[styles.badge, isConfirmed ? styles.confirmedBadge : styles.pendingBadge]}>
          <Text style={[styles.badgeText, isConfirmed ? styles.confirmedBadgeText : styles.pendingBadgeText]}>
            {isConfirmed ? 'Guardado' : 'Borrador'}
          </Text>
        </View>
      </View>

      {/* Título de la Entidad */}
      <Text style={styles.entityTitle}>{entityTitle || widget.title || 'Nuevo Registro'}</Text>

      {/* Lista de Campos Verificados */}
      {fields.length > 0 ? (
        <View style={styles.fieldsContainer}>
          {fields.map((f: { label: string; value: string }, index: number) => (
            <View key={index} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}:</Text>
              <Text style={styles.fieldValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Mensaje de error si falla */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Botones de Acción */}
      {isConfirmed ? (
        <View style={styles.confirmedBanner}>
          <Ionicons name="checkmark-done" size={18} color="#2D6A4F" />
          <Text style={styles.confirmedBannerText}>Guardado en Ayni Care exitosamente</Text>
        </View>
      ) : (
        <View style={styles.actionsContainer}>
          <Text style={styles.hintText}>
            Verifica los datos. Si necesitas un cambio, pídelo por el chat o confirma para guardarlo:
          </Text>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={isConfirming}
            activeOpacity={0.8}
          >
            {isConfirming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirmar y Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1.5,
  },
  pendingCard: {
    backgroundColor: '#FFFDF7',
    borderColor: '#FDE68A',
  },
  confirmedCard: {
    backgroundColor: '#F4FBF7',
    borderColor: '#95D5B2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconBox: {
    backgroundColor: '#FEF3C7',
  },
  confirmedIconBox: {
    backgroundColor: '#E8F5E9',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingHeaderTitle: {
    color: '#B45309',
  },
  confirmedHeaderTitle: {
    color: '#2D6A4F',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  confirmedBadge: {
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBadgeText: {
    color: '#B45309',
  },
  confirmedBadgeText: {
    color: '#065F46',
  },
  entityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B1A',
    marginBottom: 10,
  },
  fieldsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 13,
    color: '#1A2B1A',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  actionsContainer: {
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#2D6A4F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    minHeight: 48,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  confirmedBannerText: {
    fontSize: 13,
    color: '#2D6A4F',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
});
