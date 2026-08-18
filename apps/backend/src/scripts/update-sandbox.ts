import 'dotenv/config';
import axios from 'axios';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'https://happy-mice-cross.loca.lt/api/whatsapp/webhook';

async function updateSandbox() {
  console.log('🔄 Intentando configurar Webhook en Twilio Sandbox por API...');

  try {
    const res = await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Sandbox.json`, {
      auth: { username: accountSid!, password: authToken! },
    });
    console.log('Sandbox actual:', res.data);

    // Actualizar Sandbox
    const updateRes = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Sandbox.json`,
      new URLSearchParams({
        VoiceUrl: '',
        SmsUrl: webhookUrl,
        SmsMethod: 'POST',
      }),
      {
        auth: { username: accountSid!, password: authToken! },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    console.log('✅ Sandbox actualizado exitosamente:', updateRes.data);
  } catch (err: any) {
    console.error('Error al actualizar Sandbox:', err?.response?.data || err?.message || err);
  }
}

updateSandbox();
