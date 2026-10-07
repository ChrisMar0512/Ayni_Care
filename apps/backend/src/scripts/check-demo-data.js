const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const families = await prisma.family.findMany({
    include: {
      elderly: true,
      members: true,
      medications: { where: { deletedAt: null } },
      activities: { where: { deletedAt: null } },
      appointments: { where: { deletedAt: null } },
      expenses: { where: { deletedAt: null } }
    }
  });

  console.log('--- RESUMEN DE BASE DE DATOS ---');
  console.log('Total Familias:', families.length);

  for (const f of families) {
    console.log(`\nFamilia: "${f.name}" (ID: ${f.id})`);
    if (f.elderly) {
      console.log(`  👴 Adulto Mayor: ${f.elderly.name}`);
      console.log(`     Condiciones: ${f.elderly.conditions?.join(', ')}`);
      console.log(`     Alergias: ${f.elderly.allergies?.join(', ')}`);
    } else {
      console.log('  ⚠️ Sin adulto mayor asignado');
    }

    console.log('  👥 Miembros:');
    for (const m of f.members) {
      console.log(`     - ${m.name} | Rol: ${m.role} | Tel: ${m.phone || 'N/A'} | Email: ${m.email || 'N/A'}`);
    }

    console.log('  💊 Medicamentos:', f.medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`));
    console.log('  📋 Actividades:', f.activities.map(a => `${a.title} [${a.status}]`));
    console.log('  🩺 Citas:', f.appointments.map(a => `${a.title} (${a.doctorName || 'Dr.'})`));
    console.log('  💰 Gastos:', f.expenses.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
