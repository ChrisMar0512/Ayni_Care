import 'dotenv/config';
import { startWhatsAppBot } from '../services/whatsapp-bot.service';

console.log('🤖 Iniciando Ayni Care WhatsApp Bot...');
startWhatsAppBot().catch((err) => {
  console.error('❌ Error al iniciar el bot de WhatsApp:', err);
});
