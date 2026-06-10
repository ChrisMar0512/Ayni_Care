import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function AppointmentsPlaceholder() {
  return (
    <View style={styles.container}>
      <Ionicons name="calendar-outline" size={56} color="#D1D5DB" />
      <Text style={styles.title}>Agenda</Text>
      <Text style={styles.sub}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#2C2C2C' },
  sub: { fontSize: 15, color: '#9CA3AF' },
});
