import { prisma } from '../prisma/client';

async function main() {
  const seniorPhone = '51939959366';
  const childPhone = '51939959366';
  const seniorName = 'Don Carlos';
  const childName = 'Christian';

  console.log(`[Seed Yuyay] Creando paciente de prueba '${seniorName}' (${seniorPhone})...`);

  // Crear familia
  const family = await prisma.family.create({
    data: {
      name: `Familia de ${seniorName}`,
    },
  });

  // Crear cuidador
  const caregiver = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: `user_test_${Date.now()}`,
      name: childName,
      phone: childPhone,
      role: 'primary_caregiver',
      isActive: true,
    },
  });

  // Crear adulto mayor
  const elderly = await prisma.elderlyPerson.create({
    data: {
      familyId: family.id,
      name: seniorName,
      phone: seniorPhone,
      conditions: ['Hipertensión arterial', 'Diabetes tipo 2'],
      allergies: [],
      preferredCallTimes: ['08:30'],
      consentVerbal: true,
      consentDate: new Date(),
    },
  });

  // Crear medicamentos
  await prisma.medication.createMany({
    data: [
      {
        familyId: family.id,
        name: 'Losartán',
        dosage: '50mg',
        instructions: '1 tableta con el desayuno para la presión',
        frequency: 'una vez al día',
        times: ['08:30'],
        startDate: new Date(),
        isActive: true,
      },
      {
        familyId: family.id,
        name: 'Metformina',
        dosage: '850mg',
        instructions: '1 tableta con el desayuno para la glucosa',
        frequency: 'una vez al día',
        times: ['08:30'],
        startDate: new Date(),
        isActive: true,
      },
    ],
  });

  // Crear llamada programada
  const scheduledCall = await prisma.scheduledCall.create({
    data: {
      elderlyId: elderly.id,
      scheduledTime: '08:30',
      timeSlot: 'mañana',
      status: 'pending',
    },
  });

  console.log('✅ PACIENTE_CREADO_EXITOSAMENTE:');
  console.log(JSON.stringify({
    familyId: family.id,
    elderlyId: elderly.id,
    seniorName: elderly.name,
    seniorPhone: elderly.phone,
    childName: caregiver.name,
    childPhone: caregiver.phone,
    preferredCallTimes: elderly.preferredCallTimes,
    scheduledCallId: scheduledCall.id,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error('[Seed Yuyay Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

