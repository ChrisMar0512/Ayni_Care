import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { registerUnauthorizedCallback } from '../services/api';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OTPScreen } from '../screens/auth/OTPScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { CreateFamilyScreen } from '../screens/auth/CreateFamilyScreen';
import { JoinFamilyScreen } from '../screens/auth/JoinFamilyScreen';
import { TabNavigator } from './TabNavigator';
import type { AuthStackParamList, AppStackParamList, OnboardingStackParamList } from './types';

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Algo salió mal</Text>
          <Text style={styles.errorMessage}>
            Ocurrió un error inesperado. Intenta cerrar y abrir la app.
          </Text>
          <Pressable
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.errorButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Stacks ───────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OTP" component={OTPScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="OnboardingHub" component={OnboardingScreen} />
      <OnboardingStack.Screen name="CreateFamily" component={CreateFamilyScreen} />
      <OnboardingStack.Screen name="JoinFamily" component={JoinFamilyScreen} />
    </OnboardingStack.Navigator>
  );
}

function AppNavigatorInner() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={TabNavigator} />
    </AppStack.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export function AppNavigator() {
  const { user, member, isInitialized, initialize, logout } = useAuthStore();

  useEffect(() => {
    initialize();
    registerUnauthorizedCallback(logout);
  }, [initialize, logout]);

  if (!isInitialized) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>Ayni Care</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        {user ? (
          member ? (
            <AppNavigatorInner />
          ) : (
            <OnboardingNavigator />
          )
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
  },
  splashText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#D4856A',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7C6B',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#D4856A',
    borderRadius: 12,
    paddingHorizontal: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
