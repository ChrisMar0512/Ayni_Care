import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantWidget } from '../../types/assistant';

interface Props {
  widget: AssistantWidget;
}

export const DailySummaryWidgetCard: React.FC<Props> = ({ widget }) => {
  const { medications = [], activities = [], appointments = [] } = widget.data || {};

  return (
    <View className="mt-3 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300">
      <View className="flex-row items-center space-x-2 mb-3">
        <View className="w-8 h-8 rounded-full bg-emerald-200/80 items-center justify-center">
          <Ionicons name="sunny" size={20} color="#1B4332" />
        </View>
        <Text className="font-bold text-base text-emerald-950">
          {widget.title || 'Resumen del Cuidado de Hoy'}
        </Text>
      </View>

      {/* Medicamentos */}
      <View className="mb-3 bg-white/80 p-3 rounded-xl border border-emerald-100">
        <Text className="text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">
          💊 Medicamentos ({medications.length})
        </Text>
        {medications.length === 0 ? (
          <Text className="text-xs text-gray-500 italic">No hay medicamentos para hoy.</Text>
        ) : (
          medications.map((m: any, idx: number) => (
            <View key={idx} className="flex-row items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
              <Text className="text-sm font-semibold text-gray-800">• {m.name} ({m.dosage})</Text>
              <Text className={`text-xs font-bold ${m.isFullyTaken ? 'text-emerald-700' : 'text-amber-700'}`}>
                {m.isFullyTaken ? '✅ Completo' : `⏳ ${m.takenToday}/${m.times?.length || 1} tomas`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Actividades */}
      <View className="mb-3 bg-white/80 p-3 rounded-xl border border-emerald-100">
        <Text className="text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">
          📋 Tareas del Día ({activities.length})
        </Text>
        {activities.length === 0 ? (
          <Text className="text-xs text-gray-500 italic">No hay actividades registradas.</Text>
        ) : (
          activities.map((a: any, idx: number) => (
            <View key={idx} className="flex-row items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
              <Text className="text-sm text-gray-800">{a.title}</Text>
              <Text className={`text-xs font-semibold ${a.status === 'completed' ? 'text-emerald-600' : 'text-gray-500'}`}>
                {a.status === 'completed' ? 'Hecha' : 'Pendiente'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Citas */}
      {appointments.length > 0 && (
        <View className="bg-white/80 p-3 rounded-xl border border-emerald-100">
          <Text className="text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">
            📅 Citas ({appointments.length})
          </Text>
          {appointments.map((app: any, idx: number) => (
            <View key={idx} className="py-1">
              <Text className="text-sm font-bold text-indigo-900">{app.title}</Text>
              {app.doctor && <Text className="text-xs text-gray-600">Dr(a): {app.doctor}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
