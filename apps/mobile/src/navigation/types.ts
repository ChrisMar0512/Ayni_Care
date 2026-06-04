export type AuthStackParamList = {
  Login: undefined;
  OTP: {
    type: 'email' | 'sms';
    identifier: string;
  };
};

export type AppStackParamList = {
  Home: undefined;
};
