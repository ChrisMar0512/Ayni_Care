import 'dotenv/config';
import { sendWhatsAppMessage } from '../services/whatsapp.service';

async function testSend() {
  const to = 'whatsapp:+51939959366';
  const text = '🌿 *¡Hola Christian! Soy Ayni, tu asistente de Ayni Care.*\n\n¡La conexión con WhatsApp ha sido exitosa! A partir de ahora puedes mandarme mensajes o notas de voz directamente por aquí para coordinar el cuidado del Abuelo Lucho. ✨';

  console.log(`Enviando mensaje de prueba a ${to}...`);
  await sendWhatsAppMessage(to, text);
  console.log('✅ Mensaje enviado exitosamente a WhatsApp.');
}

testSend().catch((err) => {
  console.error('❌ Error enviando mensaje de WhatsApp:', err);
});
