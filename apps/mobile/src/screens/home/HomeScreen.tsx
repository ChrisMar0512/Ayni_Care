import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

export function HomeScreen() {
  const { user, member, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Hola{member?.name ? `, ${member.name}` : ''}
      </Text>
      {member?.family && (
        <Text style={styles.familyName}>{member.family.name}</Text>
      )}
      <Text style={styles.email}>{user?.email ?? user?.phone}</Text>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  familyName: {
    fontSize: 18,
    color: '#87A96B',
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6B7C6B',
    marginBottom: 48,
  },
  logoutButton: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#D4856A',
    fontWeight: '600',
  },
});
