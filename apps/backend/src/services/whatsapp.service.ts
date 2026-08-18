import twilio from 'twilio';
import axios from 'axios';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+17372212163';

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

/**
 * Envia un mensaje de texto por WhatsApp usando Twilio
 */
export const sendWhatsAppMessage = async (to: string, body: string): Promise<void> => {
  if (!twilioClient) {
    throw new Error('Twilio client no está inicializado. Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.');
  }

  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const formattedFrom = fromWhatsAppNumber.startsWith('whatsapp:') ? fromWhatsAppNumber : `whatsapp:${fromWhatsAppNumber}`;

  await twilioClient.messages.create({
    body,
    from: formattedFrom,
    to: formattedTo,
  });
};

/**
 * Descarga una nota de voz o archivo multimedia enviado por WhatsApp a través de Twilio
 * y lo convierte a Base64 para que pueda ser procesado por Google Gemini.
 */
export const downloadTwilioMediaAsBase64 = async (mediaUrl: string): Promise<string> => {
  if (!accountSid || !authToken) {
    throw new Error('Credenciales de Twilio no encontradas para descargar multimedia.');
  }

  const response = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    auth: {
      username: accountSid,
      password: authToken,
    },
  });

  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  return base64;
};
