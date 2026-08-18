import 'dotenv/config';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function inspectAndConfigure() {
  console.log('🔍 Inspeccionando recursos de Twilio...');

  // 1. Listar números entrantes
  const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
  console.log(`📞 Números entrantes encontrados: ${numbers.length}`);
  for (const n of numbers) {
    console.log(`  - ${n.phoneNumber} (${n.sid}) [SmsUrl: ${n.smsUrl}]`);
  }

  // 2. Listar Messaging Services
  const services = await client.messaging.v1.services.list({ limit: 10 });
  console.log(`💬 Messaging Services encontrados: ${services.length}`);
  for (const s of services) {
    console.log(`  - ${s.friendlyName} (${s.sid}) [InboundRequestUrl: ${s.inboundRequestUrl}]`);
  }
}

inspectAndConfigure().catch((e) => console.error('Error:', e));
