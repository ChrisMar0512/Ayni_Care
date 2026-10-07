import 'dotenv/config';
import { prisma } from '../prisma/client';
import { processAssistantChat } from '../services/ai.service';

async function testAssistant() {
  console.log('🤖 Probando el Asistente de IA directamente...');

  const member = await prisma.familyMember.findFirst({
    where: { email: 'marchristian48@gmail.com' },
    include: { family: { include: { elderly: true } } },
  });

  if (!member) {
    console.error('No se encontró el miembro familiar.');
    return;
  }

  const res = await processAssistantChat({
    user: {
      userId: member.userId,
      familyId: member.familyId,
      memberId: member.id,
      role: member.role,
    },
    message: 'Ayni, ¿cuál es el resumen de hoy del abuelo?',
  });

  console.log('\n================== RESPUESTA DE AYNI ==================');
  console.log(res.message);
  console.log('Widget:', res.widget ? res.widget.type : 'Ninguno');
  console.log('========================================================\n');
}

testAssistant().catch(console.error);
