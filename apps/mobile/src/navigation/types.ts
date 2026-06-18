import type { Medication } from '../types/medication';
import type { Appointment } from '../types/appointment';

export type AuthStackParamList = {
  Login: undefined;
  OTP: {
    type: 'email' | 'sms';
    identifier: string;
  };
};

export type AppStackParamList = {
  MainTabs: undefined;
};

export type OnboardingStackParamList = {
  OnboardingHub: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
};

export type TabParamList = {
  Inicio: undefined;
  Actividades: undefined;
  Medicamentos: undefined;
  Agenda: undefined;
  Familia: undefined;
};

export type MedicationsStackParamList = {
  MedicationsList: undefined;
  AddMedication: { medication?: Medication } | undefined;
};

export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AddAppointment: { appointment?: Appointment } | undefined;
};

export type FamiliaStackParamList = {
  FamiliaHub: undefined;
  Gastos: undefined;
  AddGasto: undefined;
  Notas: undefined;
  AddNota: undefined;
  Miembros: undefined;
  InvitarMiembro: undefined;
};

export type ActivitiesStackParamList = {
  ActivitiesList: undefined;
  AddActivity: undefined;
};
