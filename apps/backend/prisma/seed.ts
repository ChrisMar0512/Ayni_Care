import { PrismaClient, MemberRole, AppointmentType, ExpenseCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el seeding de la base de datos...');

  // 1. Limpiar base de datos
  await prisma.activityLog.deleteMany({});
  await prisma.medLog.deleteMany({});
  await prisma.expenseSplit.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.medication.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.elderlyPerson.deleteMany({});
  await prisma.family.deleteMany({});

  console.log('🗑️ Base de datos limpia.');

  // 2. Crear Familia
  const family = await prisma.family.create({
    data: {
      name: 'García Rodríguez',
    },
  });

  console.log(`👪 Familia "${family.name}" creada.`);

  // 3. Crear Adulto Mayor
  const elderly = await prisma.elderlyPerson.create({
    data: {
      familyId: family.id,
      name: 'Rosa García',
      birthDate: new Date('1948-06-15'),
      conditions: ['Hipertensión', 'Diabetes tipo 2', 'Artrosis leve'],
      allergies: ['Penicilina'],
      bloodType: 'O+',
      notes: 'Rosa es muy activa pero olvida tomar sus pastillas a tiempo. Le gusta caminar por el parque por las tardes.',
    },
  });

  console.log(`👵 Adulto mayor "${elderly.name}" creado.`);

  // 4. Crear Miembros de la Familia
  // Usamos 'dev-user-id' para el primary_caregiver para que coincida con el bypass local de login
  const caregiver1 = await prisma.familyMember.create({
    data: {
      userId: 'dev-user-id',
      familyId: family.id,
      name: 'Carlos García',
      email: 'carlos@aynicare.local',
      phone: '+51999999991',
      role: 'primary_caregiver' as MemberRole,
      isActive: true,
    },
  });

  const caregiver2 = await prisma.familyMember.create({
    data: {
      userId: 'dev-remote-id',
      familyId: family.id,
      name: 'Ana García',
      email: 'ana@aynicare.local',
      phone: '+51999999992',
      role: 'remote_family' as MemberRole,
      isActive: true,
    },
  });

  const caregiver3 = await prisma.familyMember.create({
    data: {
      userId: 'dev-paid-id',
      familyId: family.id,
      name: 'Luisa Martínez',
      email: 'luisa@aynicare.local',
      phone: '+51999999993',
      role: 'paid_caregiver' as MemberRole,
      isActive: true,
    },
  });

  console.log('👥 Miembros de la familia creados.');

  // 5. Crear Actividades del Día
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // Actividad completada
  const act1 = await prisma.activity.create({
    data: {
      familyId: family.id,
      assignedToId: caregiver1.id,
      title: 'Dar medicina de la presión',
      description: 'Dar 1 tableta de Losartán 50mg con agua',
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0),
      status: 'completed',
      priority: 'urgent',
    },
  });

  await prisma.activityLog.create({
    data: {
      activityId: act1.id,
      completedById: caregiver1.id,
      completedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 5, 0),
      notes: 'Tomada sin problemas junto con el desayuno.',
    },
  });

  // Actividades pendientes
  await prisma.activity.create({
    data: {
      familyId: family.id,
      assignedToId: caregiver3.id,
      title: 'Controlar temperatura y glucosa',
      description: 'Anotar valores en la bitácora física',
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0),
      status: 'pending',
      priority: 'normal',
    },
  });

  await prisma.activity.create({
    data: {
      familyId: family.id,
      assignedToId: caregiver3.id,
      title: 'Paseo por el parque',
      description: 'Caminar 20 minutos con andador. Llevar sombrero.',
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0, 0),
      status: 'pending',
      priority: 'low',
    },
  });

  await prisma.activity.create({
    data: {
      familyId: family.id,
      assignedToId: caregiver1.id,
      title: 'Preparar la cena',
      description: 'Dieta blanda baja en sodio',
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0, 0),
      status: 'pending',
      priority: 'normal',
    },
  });

  // Actividad de ayer completada
  const act5 = await prisma.activity.create({
    data: {
      familyId: family.id,
      assignedToId: caregiver1.id,
      title: 'Revisar stock de gasas y alcohol',
      scheduledAt: yesterday,
      status: 'completed',
      priority: 'low',
    },
  });

  await prisma.activityLog.create({
    data: {
      activityId: act5.id,
      completedById: caregiver1.id,
      completedAt: yesterday,
      notes: 'Quedan 3 paquetes de gasa y medio frasco de alcohol.',
    },
  });

  console.log('📝 Actividades de prueba creadas.');

  // 6. Crear Medicamentos
  await prisma.medication.create({
    data: {
      familyId: family.id,
      name: 'Losartán 50mg',
      dosage: '1 comprimido',
      form: 'pastilla',
      frequency: 'cada 12 horas',
      times: ['08:00', '20:00'],
      instructions: 'Tomar con el estómago lleno.',
      startDate: new Date(),
      stock: 58, // Descontamos las 2 tomas de hoy
      isActive: true,
    },
  });

  await prisma.medication.create({
    data: {
      familyId: family.id,
      name: 'Metformina 850mg',
      dosage: '1 comprimido',
      form: 'pastilla',
      frequency: 'una vez al día con el almuerzo',
      times: ['13:00'],
      instructions: 'Evitar jugos azucarados.',
      startDate: new Date(),
      stock: 30,
      isActive: true,
    },
  });

  await prisma.medication.create({
    data: {
      familyId: family.id,
      name: 'Paracetamol 500mg',
      dosage: '1 comprimido',
      form: 'pastilla',
      frequency: 'condicional a dolor o fiebre',
      times: [],
      instructions: 'Máximo 3 pastillas al día.',
      startDate: new Date(),
      stock: 20,
      isActive: true,
    },
  });

  console.log('💊 Medicamentos creados.');

  // 7. Crear Citas Próximas
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  await prisma.appointment.create({
    data: {
      familyId: family.id,
      title: 'Cardiólogo - Dr. García',
      type: 'medical' as AppointmentType,
      location: 'Clínica Anglo Americana, Consultorio 402',
      doctorName: 'Dr. Alejandro García',
      scheduledAt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0),
      durationMin: 45,
      notes: 'Llevar los últimos exámenes de sangre y el registro de presión arterial.',
      status: 'scheduled',
    },
  });

  await prisma.appointment.create({
    data: {
      familyId: family.id,
      title: 'Terapia Física - Lic. Elena',
      type: 'therapy' as AppointmentType,
      location: 'Domicilio',
      doctorName: 'Lic. Elena Pérez',
      scheduledAt: new Date(inThreeDays.getFullYear(), inThreeDays.getMonth(), inThreeDays.getDate(), 15, 0, 0),
      durationMin: 60,
      notes: 'Sesión enfocada en fortalecimiento de piernas y equilibrio.',
      status: 'scheduled',
    },
  });

  console.log('📅 Citas médicas creadas.');

  // 8. Crear Gastos Recientes
  const exp1 = await prisma.expense.create({
    data: {
      familyId: family.id,
      paidById: caregiver1.id,
      title: 'Medicinas de la semana',
      amount: 120.00,
      currency: 'PEN',
      category: 'medications' as ExpenseCategory,
      date: today,
      notes: 'Comprado en Inkafarma (Losartán y Metformina).',
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: exp1.id, memberId: caregiver1.id, amount: 60.00, isPaid: true, paidAt: today },
      { expenseId: exp1.id, memberId: caregiver2.id, amount: 60.00, isPaid: false },
    ],
  });

  const exp2 = await prisma.expense.create({
    data: {
      familyId: family.id,
      paidById: caregiver2.id,
      title: 'Consulta de Cardiología',
      amount: 150.00,
      currency: 'PEN',
      category: 'medical' as ExpenseCategory,
      date: yesterday,
      notes: 'Adelanto de consulta mensual.',
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: exp2.id, memberId: caregiver1.id, amount: 75.00, isPaid: true, paidAt: today },
      { expenseId: exp2.id, memberId: caregiver2.id, amount: 75.00, isPaid: true, paidAt: today },
    ],
  });

  console.log('💳 Gastos compartidos creados.');

  console.log('🎉 Seeding completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
