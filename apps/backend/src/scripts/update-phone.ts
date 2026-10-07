import 'dotenv/config';
import { prisma } from '../prisma/client';

async function updatePhone() {
  const member = await prisma.familyMember.findFirst({
    where: { email: 'marchristian48@gmail.com' },
  });

  if (!member) {
    console.error('No se encontró el miembro para marchristian48@gmail.com');
    return;
  }

  const updated = await prisma.familyMember.update({
    where: { id: member.id },
    data: { phone: '+51939959366' },
  });

  console.log(`✅ Teléfono actualizado a ${updated.phone} para ${updated.name} (Familia ID: ${updated.familyId})`);
}

updatePhone().finally(() => prisma.$disconnect());
