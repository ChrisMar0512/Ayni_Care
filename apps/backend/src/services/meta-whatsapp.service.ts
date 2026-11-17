import axios from 'axios';
import { formatTextForWhatsApp } from '../utils/whatsapp-formatter';

const GRAPH_API_VERSION = 'v21.0';

export interface MetaSendTextOptions {
  to: string; // e.g. "51939959366"
  text: string;
  previewUrl?: boolean;
}

/**
 * Obtiene las credenciales configuradas de Meta WhatsApp Cloud API
 */
export const getMetaCredentials = () => {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID || '';
  const accessToken = process.env.META_WA_ACCESS_TOKEN || '';
  const verifyToken = process.env.META_WA_VERIFY_TOKEN || 'ayni_care_meta_webhook_secret_2026';

  return { phoneNumberId, accessToken, verifyToken };
};

/**
 * Envía un mensaje de texto formateado a través de la Meta WhatsApp Cloud API Oficial
 */
export const sendMetaWhatsAppMessage = async ({
  to,
  text,
  previewUrl = false,
}: MetaSendTextOptions): Promise<any> => {
  const { phoneNumberId, accessToken } = getMetaCredentials();

  if (!phoneNumberId || !accessToken) {
    console.warn('[Meta WhatsApp] Credenciales no configuradas (META_WA_PHONE_NUMBER_ID o META_WA_ACCESS_TOKEN). Simulación de envío.');
    return { simulated: true, to, text };
  }

  // Limpiar número (eliminar signos +, espacios y guiones)
  const cleanTo = to.replace(/\D/g, '');
  const cleanBody = formatTextForWhatsApp(text);

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: previewUrl,
      body: cleanBody,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('[Meta WhatsApp] Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Marca un mensaje entrante como leído en WhatsApp
 */
export const markMetaMessageAsRead = async (messageId: string): Promise<void> => {
  const { phoneNumberId, accessToken } = getMetaCredentials();

  if (!phoneNumberId || !accessToken) return;

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.warn('[Meta WhatsApp] Error marcando mensaje como leído:', err.response?.data || err.message);
  }
};

/**
 * Descarga una nota de voz o multimedia desde Meta Cloud API y la devuelve en base64
 */
export const downloadMetaMediaAsBase64 = async (mediaId: string): Promise<{ base64: string; mimeType: string }> => {
  const { accessToken } = getMetaCredentials();

  if (!accessToken) {
    throw new Error('META_WA_ACCESS_TOKEN no está configurado.');
  }

  // 1. Obtener la URL de descarga del recurso multimedia
  const metaMediaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`;
  const mediaInfoRes = await axios.get(metaMediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const downloadUrl = mediaInfoRes.data.url;
  const mimeType = mediaInfoRes.data.mime_type || 'audio/ogg';

  // 2. Descargar el archivo binario con el token Bearer
  const binaryRes = await axios.get(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
  });

  const base64 = Buffer.from(binaryRes.data).toString('base64');

  return { base64, mimeType };
};

export interface MetaSendTemplateOptions {
  to: string;
  /** Nombre exacto de la plantilla aprobada en Meta, ej. "yuyay_alerta" */
  templateName: string;
  /** Código de idioma con el que se aprobó la plantilla (Meta no tiene "es_PE"; se usa "es") */
  languageCode?: string;
  /** Valores para {{1}}, {{2}}, ... del cuerpo de la plantilla, en orden */
  bodyParams: string[];
}

/**
 * Meta rechaza parámetros de plantilla vacíos, con saltos de línea, tabulaciones o
 * más de 4 espacios seguidos. Se limpian aquí para que el envío no falle.
 */
export const sanitizeTemplateParam = (value: string, maxLength = 900): string => {
  const clean = (value ?? '')
    .replace(/[\r\n\t]+/g, ' · ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
  return clean.length > 0 ? clean : '—';
};

/**
 * Envía un mensaje de plantilla aprobada. Es la única forma permitida por Meta de escribirle
 * a alguien que no nos escribió en las últimas 24 horas (reportes, alertas, bienvenida).
 */
export const sendMetaWhatsAppTemplate = async ({
  to,
  templateName,
  languageCode = 'es',
  bodyParams,
}: MetaSendTemplateOptions): Promise<unknown> => {
  const { phoneNumberId, accessToken } = getMetaCredentials();

  if (!phoneNumberId || !accessToken) {
    console.warn(`[Meta WhatsApp] Credenciales no configuradas. Simulación de plantilla "${templateName}".`);
    return { simulated: true, to, templateName, bodyParams };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/\D/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: bodyParams.map((text) => ({ type: 'text', text: sanitizeTemplateParam(text) })),
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    const detail = axios.isAxiosError(error) ? error.response?.data ?? error.message : error;
    console.error(`[Meta WhatsApp] Error enviando plantilla "${templateName}":`, detail);
    throw error;
  }
};
