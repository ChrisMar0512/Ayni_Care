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
