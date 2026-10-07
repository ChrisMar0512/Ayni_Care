import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../services/api';

// Configurar cómo se comportan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(isAuthenticated: boolean) {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          await api.post('/api/notifications/register-token', { token });
          console.log('[PushNotifications] Token registrado exitosamente:', token);
        } catch (err) {
          console.error('[PushNotifications] Error al enviar token al servidor:', err);
        }
      }
    });

    // Escuchar cuando llega una notificación en primer plano
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[PushNotifications] Notificación recibida en primer plano:', notification);
    });

    // Escuchar cuando el usuario interactúa con la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PushNotifications] Usuario interactuó con notificación:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated]);
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    console.log('[PushNotifications] Las notificaciones push no están soportadas en la versión web.');
    return undefined;
  }

  if (!Device.isDevice) {
    console.log('[PushNotifications] Se requiere un dispositivo físico para recibir notificaciones push.');
    return undefined;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync() as any;
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync() as any;
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotifications] Permiso de notificaciones push denegado.');
      return undefined;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('[PushNotifications] EAS Project ID no encontrado en la configuración.');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2D6A4F',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('[PushNotifications] Error en el registro de notificaciones push:', error);
    return undefined;
  }
}
