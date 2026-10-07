import 'dotenv/config';
import request from 'supertest';
import app from '../app';

async function testMetaWebhook() {
  console.log('🧪 Probando endpoints de Meta WhatsApp Cloud API...\n');

  const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'ayni_care_meta_webhook_secret_2026';

  // 1. Probar GET /api/whatsapp/webhook (Handshake de verificación de Meta)
  console.log('--- 📡 Paso 1: Handshake de verificación (GET) ---');
  const getRes = await request(app)
    .get('/api/whatsapp/webhook')
    .query({
      'hub.mode': 'subscribe',
      'hub.verify_token': VERIFY_TOKEN,
      'hub.challenge': 'CHALLENGE_ACCEPTED_12345',
    });

  if (getRes.status === 200 && getRes.text === 'CHALLENGE_ACCEPTED_12345') {
    console.log('✅ Handshake de Meta aprobado con éxito (200 OK & Challenge devuelto)');
  } else {
    throw new Error(`❌ Falló verificación de webhook. Status: ${getRes.status}, Body: ${getRes.text}`);
  }

  // 2. Probar POST /api/whatsapp/webhook (Recepción de mensaje)
  console.log('\n--- 📩 Paso 2: Recepción de payload de Meta (POST) ---');
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1234567890',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550269876',
                phone_number_id: '100000000000000',
              },
              contacts: [
                {
                  profile: { name: 'Christian Demo' },
                  wa_id: '51939959366',
                },
              ],
              messages: [
                {
                  from: '51939959366',
                  id: 'wamid.HBgLNT...',
                  timestamp: '1724680000',
                  text: { body: 'Ayni, ¿cuál es el resumen de hoy?' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const postRes = await request(app)
    .post('/api/whatsapp/webhook')
    .send(mockPayload);

  if (postRes.status === 200) {
    console.log('✅ Webhook POST procesado correctamente y respondido con 200 OK');
  } else {
    throw new Error(`❌ Falló POST webhook. Status: ${postRes.status}`);
  }

  console.log('\n🎉 ¡TODOS LOS ENDPOINTS DE META WHATSAPP FUNCIONAN AL 100%! 🌿');
}

testMetaWebhook().catch(console.error);
