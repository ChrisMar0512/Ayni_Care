import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

let unauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedCallback(cb: () => void) {
  unauthorizedCallback = cb;
}

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('auth_user');
      await SecureStore.deleteItemAsync('auth_member');
      unauthorizedCallback?.();
    }
    return Promise.reject(error);
  },
);

export default api;
