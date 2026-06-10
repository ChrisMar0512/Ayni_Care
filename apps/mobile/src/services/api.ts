import axios from 'axios';
import { storage } from './storage';

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
  const token = await storage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.deleteItem('access_token');
      await storage.deleteItem('refresh_token');
      await storage.deleteItem('auth_user');
      await storage.deleteItem('auth_member');
      unauthorizedCallback?.();
    }
    return Promise.reject(error);
  },
);

export default api;
