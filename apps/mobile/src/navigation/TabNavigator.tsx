import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { MedicationsScreen } from '../screens/medications/MedicationsScreen';
import { AddMedicationScreen } from '../screens/medications/AddMedicationScreen';
import { AppointmentsScreen } from '../screens/appointments/AppointmentsScreen';
import { AddAppointmentScreen } from '../screens/appointments/AddAppointmentScreen';
import { FamiliaScreen } from '../screens/family/FamiliaScreen';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { AddExpenseScreen } from '../screens/expenses/AddExpenseScreen';
import { NotesScreen } from '../screens/notes/NotesScreen';
import { AddNoteScreen } from '../screens/notes/AddNoteScreen';
import type {
  TabParamList,
  MedicationsStackParamList,
  AppointmentsStackParamList,
  FamiliaStackParamList,
} from './types';

// ─── Nested Stacks ────────────────────────────────────────────────────────────

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
  Inicio: { focused: 'home', default: 'home-outline' },
  Actividades: { focused: 'checkmark-circle', default: 'checkmark-circle-outline' },
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
        tabBarStyle: {
          backgroundColor: FONDO,
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof TabParamList];
          const iconName = focused ? icons.focused : icons.default;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Actividades" component={ActivitiesScreen} />
      <Tab.Screen name="Medicamentos" component={MedicationsNavigator} />
      <Tab.Screen name="Agenda" component={AppointmentsNavigator} />
      <Tab.Screen name="Familia" component={FamiliaNavigator} />
    </Tab.Navigator>
  );
}
