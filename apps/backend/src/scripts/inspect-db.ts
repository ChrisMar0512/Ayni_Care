import 'dotenv/config';
import { prisma } from '../prisma/client';

async function main() {
  const families = await prisma.family.findMany({
    include: {
      elderly: true,
      members: true,
      medications: { where: { deletedAt: null } },
      activities: { where: { deletedAt: null } },
      appointments: { where: { deletedAt: null } },
      expenses: true,
      notes: true,
    },
  });

  for (const f of families) {
    console.log('-------------------------------------------');
    console.log(`Familia: ${f.name} (ID: ${f.id})`);
    console.log(`Adulto Mayor: ${f.elderly?.name || 'Ninguno'}`);
    console.log('Miembros:');
    f.members.forEach((m) => console.log(`  - ${m.name} (${m.role}) [ID: ${m.id}]`));
    console.log(`Medicamentos (${f.medications.length}):`, f.medications.map((m) => m.name));
    console.log(`Actividades (${f.activities.length}):`, f.activities.map((a) => a.title));
    console.log(`Citas (${f.appointments.length}):`, f.appointments.map((a) => a.title));
    console.log(`Gastos (${f.expenses.length}):`, f.expenses.map((e) => `${e.title} (S/. ${e.amount})`));
    console.log(`Notas (${f.notes.length}):`, f.notes.map((n) => n.title));
  }
}

main().finally(() => prisma.$disconnect());
