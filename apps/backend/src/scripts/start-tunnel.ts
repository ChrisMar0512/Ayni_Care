// @ts-ignore
import localtunnel from 'localtunnel';
import axios from 'axios';

const PORT = 3000;
const VAPI_KEY = process.env.VAPI_API_KEY || '72949c1b-560f-4cc4-9950-634bec37f6e4';
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || 'b633a788-718b-4675-892b-5dfae483e51c';

async function setupTunnel() {
  console.log('[Tunnel] Iniciando túnel hacia el puerto 3000...');
  
  const subdomain = `yuyay-${Math.random().toString(36).substring(2, 7)}`;
  // @ts-ignore
  const tunnel = await localtunnel({ port: PORT, subdomain });

  console.log(`[Tunnel] ✅ Túnel activo en: ${tunnel.url}`);

  const webhookUrl = `${tunnel.url}/api/yuyay/voice-webhook`;

  // Actualizar Vapi automáticamente
  try {
    await axios.patch(
      `https://api.vapi.ai/assistant/${ASSISTANT_ID}`,
      {
        serverUrl: webhookUrl,
        serverMessages: ['end-of-call-report'],
      },
      {
        headers: {
          Authorization: `Bearer ${VAPI_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[Tunnel] 🔗 Vapi Assistant actualizado exitosamente con: ${webhookUrl}`);
    console.log('[Tunnel] 🚀 LISTO PARA PROBAR EN VAPI: Haz clic en "Talk to assistant", conversa y cuelga.');
  } catch (err: any) {
    console.error('[Tunnel] Error configurando Vapi serverUrl:', err.response?.data || err.message);
  }

  tunnel.on('close', () => {
    console.warn('[Tunnel] El túnel se cerró. Reconectando en 5 segundos...');
    setTimeout(setupTunnel, 5000);
  });

  tunnel.on('error', (err: any) => {
    console.error('[Tunnel] Error en el túnel:', err);
  });
}

setupTunnel().catch((e: any) => {
  console.error('[Tunnel Error]:', e);
  process.exit(1);
});

// Mantener el proceso vivo indefinidamente
setInterval(() => {}, 60000);
