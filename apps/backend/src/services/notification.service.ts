interface SendPushOptions {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Envía notificaciones push a través de Expo Push Notifications API.
 */
export const sendPushNotifications = async (opts: SendPushOptions): Promise<void> => {
  const { tokens, title, body, data } = opts;
  if (!tokens || tokens.length === 0) return;

  // Filtrar tokens válidos de Expo
  const validTokens = tokens.filter(t => t && t.startsWith('ExponentPushToken['));
  if (validTokens.length === 0) return;

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Push Notification] Error de Expo API: ${response.status} - ${text}`);
    } else {
      const resData = await response.json();
      console.log(`[Push Notification] Enviadas ${validTokens.length} notificaciones.`, JSON.stringify(resData));
    }
  } catch (err) {
    console.error('[Push Notification] Error al enviar push a Expo API:', err);
  }
};
