/**
 * Ayni Care — Telegram Bot Service
 * Servicio para envío de mensajes, gestión de teclados, acciones de chat y descarga de notas de voz.
 */

export interface SendTelegramMessageOptions {
  chatId: number | string;
  text: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  replyMarkup?: any;
}

export const getTelegramToken = (): string => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[Telegram] ⚠️ Advertencia: TELEGRAM_BOT_TOKEN no está configurada.');
  }
  return token || '';
};

/**
 * Envía un mensaje de texto por Telegram
 */
export const sendTelegramMessage = async (
  options: SendTelegramMessageOptions
): Promise<any> => {
  const token = getTelegramToken();
  if (!token) return null;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body: any = {
    chat_id: options.chatId,
    text: options.text,
    parse_mode: options.parseMode || 'Markdown',
  };

  if (options.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();
    if (!data.ok) {
      console.error('[Telegram] Error al enviar mensaje:', data.description);
      // Fallback si falla por Markdown syntax
      if (options.parseMode === 'Markdown' && data.description?.includes('entity')) {
        body.parse_mode = undefined;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    }
    return data;
  } catch (error: any) {
    console.error('[Telegram] Error en la petición a Telegram:', error.message || error);
    return null;
  }
};

/**
 * Muestra indicador de "escribiendo..." o "grabando audio..."
 */
export const sendTelegramChatAction = async (
  chatId: number | string,
  action: 'typing' | 'record_voice' | 'upload_document' = 'typing'
): Promise<void> => {
  const token = getTelegramToken();
  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/sendChatAction`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch (error) {
    // Non-blocking
  }
};

/**
 * Descarga una nota de voz o archivo de audio desde Telegram y la convierte a Base64
 */
export const downloadTelegramAudioAsBase64 = async (
  fileId: string
): Promise<{ base64: string; mimeType: string }> => {
  const token = getTelegramToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurada');

  // 1. Obtener file_path
  const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const fileRes = await fetch(getFileUrl);
  const fileData: any = await fileRes.json();

  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error(`No se pudo obtener el archivo de Telegram: ${fileData.description || 'Error desconocido'}`);
  }

  const filePath = fileData.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  // 2. Descargar binario
  const downloadRes = await fetch(downloadUrl);
  const arrayBuffer = await downloadRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  // Determinar mimeType (las notas de voz de Telegram suelen ser ogg/opus)
  let mimeType = 'audio/ogg';
  if (filePath.endsWith('.mp3')) mimeType = 'audio/mp3';
  else if (filePath.endsWith('.m4a')) mimeType = 'audio/m4a';
  else if (filePath.endsWith('.wav')) mimeType = 'audio/wav';

  return { base64, mimeType };
};

/**
 * Configura el Webhook de Telegram hacia la URL del backend
 */
export const setTelegramWebhook = async (webhookUrl: string): Promise<any> => {
  const token = getTelegramToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurada');

  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  return await response.json();
};
