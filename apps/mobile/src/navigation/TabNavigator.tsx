import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { MedicationsPlaceholder } from '../screens/medications/MedicationsPlaceholder';
import { AppointmentsPlaceholder } from '../screens/appointments/AppointmentsPlaceholder';
import { FamilyPlaceholder } from '../screens/family/FamilyPlaceholder';
import type { TabParamList } from './types';

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
      <Tab.Screen name="Medicamentos" component={MedicationsPlaceholder} />
      <Tab.Screen name="Agenda" component={AppointmentsPlaceholder} />
      <Tab.Screen name="Familia" component={FamilyPlaceholder} />
    </Tab.Navigator>
  );
}
