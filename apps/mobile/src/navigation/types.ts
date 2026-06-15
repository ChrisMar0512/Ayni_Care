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
  AddMedication: undefined;
};

export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AddAppointment: undefined;
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
