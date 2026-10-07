import 'dotenv/config';
import { prisma } from '../prisma/client';
import { MemberRole, AppointmentType, ExpenseCategory } from '@prisma/client';

async function seedDemoProfile() {
  console.log('🌟 Iniciando la creación del Perfil Demo Completo para Ayni Care...');

  // 1. Buscar todas las familias existentes o crear la principal
  let families = await prisma.family.findMany({
    include: { members: true },
  });

  if (families.length === 0) {
    const newFamily = await prisma.family.create({
      data: { name: 'Familia Carrillo' },
    });
    families = [await prisma.family.findUniqueOrThrow({ where: { id: newFamily.id }, include: { members: true } })];
  }

  for (const family of families) {
    console.log(`\n======================================================`);
    console.log(`Configurando Familia: "${family.name}" (ID: ${family.id})`);

    // 2. Limpiar registros antiguos de la familia para dejarla limpia y fresca
    await prisma.activityLog.deleteMany({ where: { activity: { familyId: family.id } } });
    await prisma.medLog.deleteMany({ where: { medication: { familyId: family.id } } });
    await prisma.expenseSplit.deleteMany({ where: { expense: { familyId: family.id } } });
    await prisma.activity.deleteMany({ where: { familyId: family.id } });
    await prisma.medication.deleteMany({ where: { familyId: family.id } });
    await prisma.appointment.deleteMany({ where: { familyId: family.id } });
    await prisma.expense.deleteMany({ where: { familyId: family.id } });
    await prisma.note.deleteMany({ where: { familyId: family.id } });

    // 3. Crear / Actualizar Adulto Mayor (Abuelo Lucho)
    const elderly = await prisma.elderlyPerson.upsert({
      where: { familyId: family.id },
      update: {
        name: 'Abuelo Lucho (Luis Carrillo)',
        birthDate: new Date('1948-05-15'),
        conditions: ['Hipertensión arterial', 'Diabetes tipo 2', 'Artrosis leve de rodilla'],
        allergies: ['Penicilina', 'Sulfas'],
        bloodType: 'O+',
        notes: 'Contacto de emergencia: Dra. Patricia Solís (Geriatra) - 987654321. Le gusta tomar sus medicinas con jugo de papaya. Camina por las tardes con su andador.',
      },
      create: {
        familyId: family.id,
        name: 'Abuelo Lucho (Luis Carrillo)',
        birthDate: new Date('1948-05-15'),
        conditions: ['Hipertensión arterial', 'Diabetes tipo 2', 'Artrosis leve de rodilla'],
        allergies: ['Penicilina', 'Sulfas'],
        bloodType: 'O+',
        notes: 'Contacto de emergencia: Dra. Patricia Solís (Geriatra) - 987654321. Le gusta tomar sus medicinas con jugo de papaya. Camina por las tardes con su andador.',
      },
    });
    console.log(`👴 Adulto Mayor configurado: ${elderly.name}`);

    // 4. Asegurar los miembros de la red familiar
    // Mantener los miembros existentes y añadir los complementarios si faltan
    let primaryMember = family.members.find((m) => m.role === 'primary_caregiver') || family.members[0];

    if (!primaryMember) {
      primaryMember = await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: '492c80d4-0510-4e21-b25e-2b289a64055d',
          name: 'Christian Carrillo',
          email: 'marchristian48@gmail.com',
          phone: '+51999888777',
          role: 'primary_caregiver' as MemberRole,
          isActive: true,
        },
      });
    } else {
      await prisma.familyMember.update({
        where: { id: primaryMember.id },
        data: {
          userId: '492c80d4-0510-4e21-b25e-2b289a64055d',
          email: 'marchristian48@gmail.com',
        },
      });
    }

    let mariaMember = family.members.find((m) => m.name.toLowerCase().includes('maría') || m.role === 'remote_family');
    if (!mariaMember) {
      mariaMember = await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: `maria-${Date.now()}`,
          name: 'María Carrillo',
          email: 'maria.carrillo@gmail.com',
          phone: '+13055558899',
          role: 'remote_family' as MemberRole,
          isActive: true,
        },
      });
    }

    let carlosMember = family.members.find((m) => m.name.toLowerCase().includes('carlos') || m.role === 'weekend_helper');
    if (!carlosMember) {
      carlosMember = await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: `carlos-${Date.now()}`,
          name: 'Carlos Carrillo',
          email: 'carlos.carrillo@gmail.com',
          phone: '+51988776655',
          role: 'weekend_helper' as MemberRole,
          isActive: true,
        },
      });
    }

    let rosaMember = family.members.find((m) => m.name.toLowerCase().includes('rosa') || m.role === 'paid_caregiver');
    if (!rosaMember) {
      rosaMember = await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: `rosa-${Date.now()}`,
          name: 'Rosa Mendoza',
          email: 'rosa.cuidadora@aynicare.pe',
          phone: '+51977665544',
          role: 'paid_caregiver' as MemberRole,
          isActive: true,
        },
      });
    }

    console.log(`👥 Red de Cuidado activa:`);
    console.log(`   - ${primaryMember.name} (${primaryMember.role})`);
    console.log(`   - ${mariaMember.name} (${mariaMember.role})`);
    console.log(`   - ${carlosMember.name} (${carlosMember.role})`);
    console.log(`   - ${rosaMember.name} (${rosaMember.role})`);

    // 5. Medicamentos configurados en el catálogo
    const medLosartan = await prisma.medication.create({
      data: {
        familyId: family.id,
        name: 'Losartán 50mg',
        dosage: '1 comprimido',
        form: 'pastilla',
        frequency: 'Cada 12 horas (Mañana y Noche)',
        times: ['08:00', '20:00'],
        instructions: 'Tomar después del desayuno y después de la cena con un vaso de agua.',
        startDate: new Date(),
        stock: 56,
        isActive: true,
      },
    });

    const medMetformina = await prisma.medication.create({
      data: {
        familyId: family.id,
        name: 'Metformina 850mg',
        dosage: '1 comprimido',
        form: 'pastilla',
        frequency: 'Una vez al día con el almuerzo',
        times: ['13:00'],
        instructions: 'Tomar a mitad del almuerzo para evitar malestar estomacal.',
        startDate: new Date(),
        stock: 28,
        isActive: true,
      },
    });

    const medOmeprazol = await prisma.medication.create({
      data: {
        familyId: family.id,
        name: 'Omeprazol 20mg',
        dosage: '1 cápsula',
        form: 'cápsula',
        frequency: 'Todos los días en ayunas',
        times: ['07:30'],
        instructions: 'Tomar 30 minutos antes del desayuno.',
        startDate: new Date(),
        stock: 30,
        isActive: true,
      },
    });

    const medParacetamol = await prisma.medication.create({
      data: {
        familyId: family.id,
        name: 'Paracetamol 500mg',
        dosage: '1 tableta',
        form: 'pastilla',
        frequency: 'Condicional si presenta dolor o fiebre',
        times: [],
        instructions: 'Máximo 3 pastillas al día. No administrar en ayunas.',
        startDate: new Date(),
        stock: 20,
        isActive: true,
      },
    });

    // Registrar toma de hoy en la mañana de Losartán
    const todayMorning = new Date();
    todayMorning.setHours(todayMorning.getHours() - 4);
    await prisma.medLog.create({
      data: {
        medicationId: medLosartan.id,
        givenById: primaryMember.id,
        givenAt: todayMorning,
        skipped: false,
        notes: 'Tomada puntualmente a las 8:00 AM con el desayuno.',
      },
    });

    console.log(`💊 4 Medicamentos creados con stock y 1 toma matutina registrada.`);

    // 6. Actividades de Cuidado Diario (Hoy)
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Actividad 1 (Completada)
    const act1 = await prisma.activity.create({
      data: {
        familyId: family.id,
        assignedToId: primaryMember.id,
        title: 'Desayuno y medicina de la presión',
        description: 'Avena con manzana cocida y 1 tableta de Losartán 50mg.',
        scheduledAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: 'completed',
        priority: 'urgent',
      },
    });
    await prisma.activityLog.create({
      data: {
        activityId: act1.id,
        completedById: primaryMember.id,
        completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        notes: 'Comió todo su desayuno sin inconvenientes.',
      },
    });

    // Actividad 2 (Pendiente - Mediodía)
    await prisma.activity.create({
      data: {
        familyId: family.id,
        assignedToId: rosaMember.id,
        title: 'Control de glucosa y presión arterial',
        description: 'Medir con el glucómetro y tensiómetro digital antes del almuerzo.',
        scheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        status: 'pending',
        priority: 'normal',
      },
    });

    // Actividad 3 (Pendiente - Tarde)
    await prisma.activity.create({
      data: {
        familyId: family.id,
        assignedToId: rosaMember.id,
        title: 'Paseo de 20 minutos por el parque',
        description: 'Caminar con el andador para estimular movilidad. Llevar gorro para el sol.',
        scheduledAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        status: 'pending',
        priority: 'low',
      },
    });

    // Actividad 4 (Pendiente - Terapia)
    await prisma.activity.create({
      data: {
        familyId: family.id,
        assignedToId: carlosMember.id,
        title: 'Ejercicios de movilidad para la rodilla',
        description: 'Flexión y extensión suave según la pauta del fisioterapeuta.',
        scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        status: 'pending',
        priority: 'normal',
      },
    });

    console.log(`📋 4 Actividades creadas (1 completada, 3 pendientes para hoy).`);

    // 7. Citas Médicas Próximas
    const nextTuesday = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    nextTuesday.setHours(10, 0, 0, 0);

    const nextFriday = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    nextFriday.setHours(15, 30, 0, 0);

    await prisma.appointment.create({
      data: {
        familyId: family.id,
        title: 'Control Geriátrico Mensual',
        doctorName: 'Dra. Patricia Solís',
        location: 'Clínica San Felipe, Consultorio 305',
        type: 'medical' as AppointmentType,
        scheduledAt: nextTuesday,
        durationMin: 45,
        notes: 'Llevar bitácora de presión y glucosa de las últimas 2 semanas.',
      },
    });

    await prisma.appointment.create({
      data: {
        familyId: family.id,
        title: 'Fisioterapia y Rehabilitación de Rodilla',
        doctorName: 'Lic. Roberto Castro',
        location: 'A domicilio',
        type: 'therapy' as AppointmentType,
        scheduledAt: nextFriday,
        durationMin: 60,
        notes: 'Sesión de fortalecimiento de cuádriceps y reeducación de la marcha.',
      },
    });

    console.log(`🩺 2 Citas médicas próximas programadas.`);

    // 8. Gastos Compartidos Recientes
    const exp1 = await prisma.expense.create({
      data: {
        familyId: family.id,
        paidById: primaryMember.id,
        title: 'Pañales para adultos y apósitos (Pack x3)',
        amount: 120.00,
        currency: 'PEN',
        category: 'hygiene' as ExpenseCategory,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        notes: 'Comprado en Inkafarma para el mes.',
      },
    });

    await prisma.expenseSplit.createMany({
      data: [
        { expenseId: exp1.id, memberId: primaryMember.id, amount: 40.00, isPaid: true, paidAt: new Date() },
        { expenseId: exp1.id, memberId: mariaMember.id, amount: 40.00, isPaid: true, paidAt: new Date() },
        { expenseId: exp1.id, memberId: carlosMember.id, amount: 40.00, isPaid: false },
      ],
    });

    const exp2 = await prisma.expense.create({
      data: {
        familyId: family.id,
        paidById: mariaMember.id,
        title: 'Farmacia Mensual (Losartán y Metformina)',
        amount: 180.00,
        currency: 'PEN',
        category: 'medications' as ExpenseCategory,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        notes: 'Transferencia bancaria directa.',
      },
    });

    await prisma.expenseSplit.createMany({
      data: [
        { expenseId: exp2.id, memberId: primaryMember.id, amount: 90.00, isPaid: true, paidAt: new Date() },
        { expenseId: exp2.id, memberId: mariaMember.id, amount: 90.00, isPaid: true, paidAt: new Date() },
      ],
    });

    console.log(`💰 2 Gastos compartidos con división calculada creados.`);

    // 9. Notas Clínicas y de Relevo (Handoff)
    await prisma.note.create({
      data: {
        familyId: family.id,
        authorId: primaryMember.id,
        title: 'Amaneció con excelente ánimo',
        content: 'El abuelo durmió 8 horas continuas. Desayunó toda su avena y su presión matutina estuvo en 120/80.',
        type: 'observation',
      },
    });

    await prisma.note.create({
      data: {
        familyId: family.id,
        authorId: rosaMember.id,
        title: 'Nota de Relevo de Guardia',
        content: 'Dejo el almuerzo listo en el refrigerador y las pastillas de la tarde separadas en el pastillero azul.',
        type: 'handoff',
      },
    });

    await prisma.note.create({
      data: {
        familyId: family.id,
        authorId: carlosMember.id,
        title: 'Molestia leve en la rodilla',
        content: 'Mencionó ligera rigidez al levantarse del sillón. Le apliqué crema analgésica y mejoró rápidamente.',
        type: 'symptom',
      },
    });

    console.log(`📝 3 Notas clínicas y de relevo guardadas.`);
  }

  console.log(`\n🎉 ¡Perfil Demo creado exitosamente con datos en todos los dominios!`);
}

seedDemoProfile()
  .catch((e) => {
    console.error('❌ Error al crear perfil demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
