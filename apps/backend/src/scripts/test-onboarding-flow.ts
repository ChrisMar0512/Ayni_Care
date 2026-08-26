import 'dotenv/config';
import { prisma } from '../prisma/client';
import { processOnboardingMessage } from '../services/onboarding.service';

const TEST_PHONE = '51999888777';

async function testOnboardingFlow() {
  console.log('🧪 Iniciando prueba de Onboarding Conversacional 100% en WhatsApp...\n');

  // Limpiar datos de prueba previos si existen
  await prisma.familyMember.deleteMany({ where: { phone: TEST_PHONE } });
  await prisma.family.deleteMany({ where: { name: { contains: 'Elena' } } });

  // 1. Mensaje inicial (Saludo / Inicio)
  console.log('--- 💬 Paso 1: Usuario saluda por primera vez ---');
  const step1 = await processOnboardingMessage({
    phone: TEST_PHONE,
    text: 'Hola Ayni',
    senderName: 'Carlos Pérez',
  });
  console.log('🤖 Respuesta de Ayni:');
  console.log(step1);
  console.log('--------------------------------------------------\n');

  // 2. Paso 2: Usuario indica a quién cuida
  console.log('--- 💬 Paso 2: Usuario indica los datos del adulto mayor ---');
  const step2 = await processOnboardingMessage({
    phone: TEST_PHONE,
    text: 'Quiero cuidar a mi mamá Elena Gómez de 82 años',
    senderName: 'Carlos Pérez',
  });
  console.log('🤖 Respuesta de Ayni:');
  console.log(step2);
  console.log('--------------------------------------------------\n');

  // Verificar creación en Base de Datos
  const createdMember = await prisma.familyMember.findFirst({
    where: { phone: TEST_PHONE },
    include: { family: { include: { elderly: true } } },
  });

  if (!createdMember || !createdMember.family?.elderly) {
    throw new Error('❌ Falló la creación en BD de la Familia o Adulto Mayor');
  }
  console.log(`✅ BD: Creada Familia "${createdMember.family.name}", Adulto Mayor "${createdMember.family.elderly.name}", Cuidador "${createdMember.name}" (${createdMember.role})\n`);

  // 3. Paso 3: Usuario envía medicamentos
  console.log('--- 💬 Paso 3: Usuario envía la lista de medicamentos ---');
  const step3 = await processOnboardingMessage({
    phone: TEST_PHONE,
    text: 'Toma Losartán 50mg a las 8:00 y 20:00, y Omeprazol 20mg a las 07:00 en ayunas',
    senderName: 'Carlos Pérez',
  });
  console.log('🤖 Respuesta de Ayni:');
  console.log(step3);
  console.log('--------------------------------------------------\n');

  // Verificar medicamentos en BD
  const meds = await prisma.medication.findMany({
    where: { familyId: createdMember.familyId },
  });

  console.log(`✅ BD: Se registraron ${meds.length} medicamentos en horario:`);
  for (const m of meds) {
    console.log(`   - 💊 ${m.name} (${m.dosage}) -> Horarios: ${m.times.join(', ')}`);
  }

  // Limpieza final de prueba
  await prisma.medication.deleteMany({ where: { familyId: createdMember.familyId } });
  await prisma.familyMember.deleteMany({ where: { familyId: createdMember.familyId } });
  await prisma.elderlyPerson.deleteMany({ where: { familyId: createdMember.familyId } });
  await prisma.family.deleteMany({ where: { id: createdMember.familyId } });

  console.log('\n🎉 ¡PRUEBA DE ONBOARDING CONVERSACIONAL COMPLETADA CON ÉXITO! 🌿');
}

testOnboardingFlow().catch(console.error);
