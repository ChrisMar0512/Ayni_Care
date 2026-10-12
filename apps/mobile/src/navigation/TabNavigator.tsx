import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { AddActivityScreen } from '../screens/activities/AddActivityScreen';
import { MedicationsScreen } from '../screens/medications/MedicationsScreen';
import { AddMedicationScreen } from '../screens/medications/AddMedicationScreen';
import { AppointmentsScreen } from '../screens/appointments/AppointmentsScreen';
import { AddAppointmentScreen } from '../screens/appointments/AddAppointmentScreen';
import { FamiliaScreen } from '../screens/family/FamiliaScreen';
import { FamilyMembersScreen } from '../screens/family/FamilyMembersScreen';
import { InviteMemberScreen } from '../screens/family/InviteMemberScreen';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { AddExpenseScreen } from '../screens/expenses/AddExpenseScreen';
import { NotesScreen } from '../screens/notes/NotesScreen';
import { AddNoteScreen } from '../screens/notes/AddNoteScreen';
import { ChatAssistantScreen } from '../screens/assistant/ChatAssistantScreen';
import type {
  TabParamList,
  ActivitiesStackParamList,
  MedicationsStackParamList,
  AppointmentsStackParamList,
  FamiliaStackParamList,
} from './types';

// ─── Nested Stacks ────────────────────────────────────────────────────────────

const ActivitiesStack = createNativeStackNavigator<ActivitiesStackParamList>();

function ActivitiesNavigator() {
  return (
    <ActivitiesStack.Navigator screenOptions={{ headerShown: false }}>
      <ActivitiesStack.Screen name="ActivitiesList" component={ActivitiesScreen} />
      <ActivitiesStack.Screen name="AddActivity" component={AddActivityScreen} />
    </ActivitiesStack.Navigator>
  );
}

const MedicationsStack = createNativeStackNavigator<MedicationsStackParamList>();

function MedicationsNavigator() {
  return (
    <MedicationsStack.Navigator screenOptions={{ headerShown: false }}>
      <MedicationsStack.Screen name="MedicationsList" component={MedicationsScreen} />
      <MedicationsStack.Screen name="AddMedication" component={AddMedicationScreen} />
    </MedicationsStack.Navigator>
  );
}

const AppointmentsStack = createNativeStackNavigator<AppointmentsStackParamList>();

function AppointmentsNavigator() {
  return (
    <AppointmentsStack.Navigator screenOptions={{ headerShown: false }}>
      <AppointmentsStack.Screen name="AppointmentsList" component={AppointmentsScreen} />
      <AppointmentsStack.Screen name="AddAppointment" component={AddAppointmentScreen} />
    </AppointmentsStack.Navigator>
  );
}

const FamiliaStack = createNativeStackNavigator<FamiliaStackParamList>();

function FamiliaNavigator() {
  return (
    <FamiliaStack.Navigator screenOptions={{ headerShown: false }}>
      <FamiliaStack.Screen name="FamiliaHub" component={FamiliaScreen} />
      <FamiliaStack.Screen name="Gastos" component={ExpensesScreen} />
      <FamiliaStack.Screen name="AddGasto" component={AddExpenseScreen} />
      <FamiliaStack.Screen name="Notas" component={NotesScreen} />
      <FamiliaStack.Screen name="AddNota" component={AddNoteScreen} />
      <FamiliaStack.Screen name="Miembros" component={FamilyMembersScreen} />
      <FamiliaStack.Screen name="InvitarMiembro" component={InviteMemberScreen} />
    </FamiliaStack.Navigator>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<TabParamList>();

const TERRACOTA = '#D4856A';
const GRIS = '#9CA3AF';
const FONDO = '#FFFFFF';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof TabParamList, { focused: IconName; default: IconName }> = {
  Asistente: { focused: 'sparkles', default: 'sparkles-outline' },
  Inicio: { focused: 'home', default: 'home-outline' },
  Medicamentos: { focused: 'medical', default: 'medical-outline' },
  Agenda: { focused: 'calendar', default: 'calendar-outline' },
  Familia: { focused: 'people', default: 'people-outline' },
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: TERRACOTA,
        tabBarInactiveTintColor: GRIS,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: FONDO,
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: -0.2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name as keyof TabParamList];
          const iconName = focused ? icons.focused : icons.default;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Asistente" 
        component={ChatAssistantScreen} 
        options={{ tabBarLabel: 'Asistente' }}
      />
      <Tab.Screen 
        name="Inicio" 
        component={ActivitiesNavigator} 
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen 
        name="Medicamentos" 
        component={MedicationsNavigator} 
        options={{ tabBarLabel: 'Medicina' }}
      />
      <Tab.Screen 
        name="Agenda" 
        component={AppointmentsNavigator} 
        options={{ tabBarLabel: 'Agenda' }}
      />
      <Tab.Screen 
        name="Familia" 
        component={FamiliaNavigator} 
        options={{ tabBarLabel: 'Familia' }}
      />
    </Tab.Navigator>
  );
}
