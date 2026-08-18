import 'dotenv/config';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'https://happy-mice-cross.loca.lt/api/whatsapp/webhook';

const client = twilio(accountSid, authToken);

async function autoCreateService() {
  console.log('🚀 Creando Messaging Service y configurando Webhook automáticamente por API...');

  try {
    const service = await client.messaging.v1.services.create({
      friendlyName: 'Ayni Care WhatsApp Service',
      inboundRequestUrl: webhookUrl,
      inboundMethod: 'POST',
    });

    console.log(`✅ Messaging Service creado exitosamente con SID: ${service.sid}`);
    console.log(`🔗 Inbound Webhook configurado en: ${service.inboundRequestUrl}`);
  } catch (err: any) {
    console.error('Error al crear Messaging Service:', err?.message || err);
  }
}

autoCreateService();
