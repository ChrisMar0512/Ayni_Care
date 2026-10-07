import 'dotenv/config';
import { processAssistantChat } from '../services/ai.service';
import { prisma } from '../prisma/client';

async function testAppointments() {
  const member = await prisma.familyMember.findFirst({
    where: { email: 'marchristian48@gmail.com' },
  });

  if (!member) {
    console.error('Member no encontrado');
    return;
  }

  console.log('Probando consulta de citas con el asistente...');
  const res = await processAssistantChat({
    user: {
      userId: member.userId,
      familyId: member.familyId,
      memberId: member.id,
      role: member.role,
    },
    message: '¿Cuál es la próxima cita médica y con qué doctor?',
  });

  console.log('\n--- RESPUESTA DE AYNI ---');
  console.log('Mensaje:', res.message);
  console.log('Acciones ejecutadas:', res.actionsExecuted);
  console.log('Widget generado:', JSON.stringify(res.widget, null, 2));
}

testAppointments().finally(() => prisma.$disconnect());
