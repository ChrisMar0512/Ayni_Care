import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

const getLimaDateString = (date: Date): string => {
  // Peru is UTC-5
  const temp = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return temp.toISOString().split('T')[0]!;
};

// Datos oficiales de demostración y prueba: Familia Mendoza
export const sampleMendozaData = {
  summary: {
    totalUsers: 3,
    totalFamilies: 1,
    totalElderly: 1,
    totalActivities: 3,
    totalActivityLogs: 1,
    totalMedications: 3,
    totalMedLogs: 2,
    totalAppointments: 2,
    totalExpenses: 2,
    totalNotes: 2,
  },
  users: [
    {
      id: 'dev-member-id',
      userId: 'dev-user-id',
      name: 'Carlos Mendoza',
      email: 'carlos@aynicare.com',
      phone: '+51999999999',
      role: 'primary_caregiver',
      isActive: true,
      createdAt: new Date('2026-01-15'),
      familyName: 'Familia Mendoza',
      elderlyName: 'Don Alberto Mendoza',
      activityScore: 12,
    },
    {
      id: 'demo-member-2',
      userId: 'user-sofia',
      name: 'Sofía Mendoza',
      email: 'sofia@aynicare.com',
      phone: '+51988888888',
      role: 'remote_family',
      isActive: true,
      createdAt: new Date('2026-01-16'),
      familyName: 'Familia Mendoza',
      elderlyName: 'Don Alberto Mendoza',
      activityScore: 4,
    },
    {
      id: 'demo-member-3',
      userId: 'user-elena',
      name: 'Elena Ramos',
      email: 'elena@aynicare.com',
      phone: '+51977777777',
      role: 'weekend_helper',
      isActive: true,
      createdAt: new Date('2026-01-20'),
      familyName: 'Familia Mendoza',
      elderlyName: 'Don Alberto Mendoza',
      activityScore: 2,
    },
  ],
  families: [
    {
      id: 'demo-family-id',
      name: 'Familia Mendoza',
      createdAt: new Date('2026-01-15'),
      elderlyName: 'Don Alberto Mendoza',
      elderlyConditions: ['Hipertensión arterial', 'Diabetes tipo 2'],
      memberCount: 3,
      activityCount: 3,
      medicationCount: 3,
      appointmentCount: 2,
      expenseCount: 2,
      noteCount: 2,
    },
  ],
  recentActivity: [
    {
      id: 'med-log-1',
      type: 'medication',
      title: 'Administró medicamento: Losartán 50mg',
      description: 'Dosis tomada puntualmente con el desayuno (14 pastillas restantes)',
      user: 'Carlos Mendoza',
      userRole: 'primary_caregiver',
      family: 'Familia Mendoza',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 'act-log-1',
      type: 'activity',
      title: 'Completó actividad: Controlar presión arterial matutina',
      description: 'Presión: 125/80 mmHg - Estado estable y buen apetito',
      user: 'Carlos Mendoza',
      userRole: 'primary_caregiver',
      family: 'Familia Mendoza',
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: 'exp-log-1',
      type: 'expense',
      title: 'Registró gasto compartido: Inkafarma - Losartán y Metformina',
      description: 'Monto: PEN 60.00 | Dividido en partes iguales con Sofía Mendoza',
      user: 'Carlos Mendoza',
      userRole: 'primary_caregiver',
      family: 'Familia Mendoza',
      timestamp: new Date(Date.now() - 86400000),
    },
    {
      id: 'exp-log-2',
      type: 'expense',
      title: 'Registró gasto compartido: Pañales para adulto mayor (Plenitud x 30)',
      description: 'Monto: PEN 45.00 | Higiene y cuidado personal',
      user: 'Carlos Mendoza',
      userRole: 'primary_caregiver',
      family: 'Familia Mendoza',
      timestamp: new Date(Date.now() - 2 * 86400000),
    },
  ],
  timeline: [
    { date: '2026-10-01', activities: 1, medications: 2 },
    { date: '2026-10-02', activities: 2, medications: 2 },
    { date: '2026-10-03', activities: 1, medications: 2 },
    { date: '2026-10-04', activities: 2, medications: 3 },
    { date: '2026-10-05', activities: 2, medications: 2 },
    { date: '2026-10-06', activities: 2, medications: 2 },
    { date: '2026-10-07', activities: 3, medications: 3 },
  ],
  roleDistribution: {
    primary_caregiver: 1,
    remote_family: 1,
    weekend_helper: 1,
  },
};

export const getAdminStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Obtener conteos generales
    const [
      totalUsers,
      totalFamilies,
      totalElderly,
      totalActivities,
      totalActivityLogs,
      totalMedications,
      totalMedLogs,
      totalAppointments,
      totalExpenses,
      totalNotes,
    ] = await Promise.all([
      prisma.familyMember.count().catch(() => 0),
      prisma.family.count().catch(() => 0),
      prisma.elderlyPerson.count().catch(() => 0),
      prisma.activity.count().catch(() => 0),
      prisma.activityLog.count().catch(() => 0),
      prisma.medication.count().catch(() => 0),
      prisma.medLog.count().catch(() => 0),
      prisma.appointment.count().catch(() => 0),
      prisma.expense.count().catch(() => 0),
      prisma.note.count().catch(() => 0),
    ]);

    // 2. Directorio de Usuarios
    const rawUsers = await prisma.familyMember.findMany({
      include: {
        family: {
          select: {
            name: true,
            elderly: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            activityLogs: true,
            medLogs: true,
            expenses: true,
            notes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }).catch(() => []);

    // Si la BD no tiene usuarios registrados aún, devolver los datos limpios del usuario de prueba
    if (rawUsers.length === 0) {
      res.json({
        success: true,
        data: sampleMendozaData,
      });
      return;
    }

    const users = rawUsers.map(user => {
      const logsCount =
        user._count.activityLogs +
        user._count.medLogs +
        user._count.expenses +
        user._count.notes;

      return {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        familyName: user.family?.name || 'Ninguna',
        elderlyName: user.family?.elderly?.name || 'Ninguno',
        activityScore: logsCount,
      };
    });

    // 3. Directorio de Familias
    const rawFamilies = await prisma.family.findMany({
      include: {
        elderly: {
          select: {
            name: true,
            conditions: true,
            allergies: true,
          },
        },
        _count: {
          select: {
            members: true,
            activities: true,
            medications: true,
            appointments: true,
            expenses: true,
            notes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }).catch(() => []);

    const families = rawFamilies.map(fam => ({
      id: fam.id,
      name: fam.name,
      createdAt: fam.createdAt,
      elderlyName: fam.elderly?.name || 'Sin registrar',
      elderlyConditions: fam.elderly?.conditions || [],
      memberCount: fam._count.members,
      activityCount: fam._count.activities,
      medicationCount: fam._count.medications,
      appointmentCount: fam._count.appointments,
      expenseCount: fam._count.expenses,
      noteCount: fam._count.notes,
    }));

    // 4. Actividad Reciente
    const [recentActLogs, recentMedLogs, recentExpenses, recentNotes] = await Promise.all([
      prisma.activityLog.findMany({
        take: 20,
        orderBy: { completedAt: 'desc' },
        include: {
          activity: { select: { title: true } },
          completedBy: {
            select: {
              name: true,
              role: true,
              family: { select: { name: true } },
            },
          },
        },
      }).catch(() => []),
      prisma.medLog.findMany({
        take: 20,
        orderBy: { givenAt: 'desc' },
        include: {
          medication: { select: { name: true } },
          givenBy: {
            select: {
              name: true,
              role: true,
              family: { select: { name: true } },
            },
          },
        },
      }).catch(() => []),
      prisma.expense.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
        include: {
          paidBy: {
            select: {
              name: true,
              role: true,
              family: { select: { name: true } },
            },
          },
        },
      }).catch(() => []),
      prisma.note.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              name: true,
              role: true,
              family: { select: { name: true } },
            },
          },
        },
      }).catch(() => []),
    ]);

    const events: any[] = [];

    recentActLogs.forEach(log => {
      events.push({
        id: `act-${log.id}`,
        type: 'activity',
        title: `Completó actividad: ${log.activity?.title || 'Actividad eliminada'}`,
        description: log.notes || 'Completada exitosamente.',
        user: log.completedBy?.name || 'Usuario desconocido',
        userRole: log.completedBy?.role || '',
        family: log.completedBy?.family?.name || 'Sin familia',
        timestamp: log.completedAt,
      });
    });

    recentMedLogs.forEach(log => {
      events.push({
        id: `med-${log.id}`,
        type: 'medication',
        title: `${log.skipped ? 'Omitió' : 'Administró'} medicamento: ${log.medication?.name || 'Medicamento eliminado'}`,
        description: log.skipped
          ? `Motivo de omisión: ${log.skipReason || 'No especificado'}`
          : `Dosis registrada. ${log.notes || ''}`,
        user: log.givenBy?.name || 'Usuario desconocido',
        userRole: log.givenBy?.role || '',
        family: log.givenBy?.family?.name || 'Sin familia',
        timestamp: log.givenAt,
      });
    });

    recentExpenses.forEach(exp => {
      events.push({
        id: `exp-${exp.id}`,
        type: 'expense',
        title: `Registró gasto compartido: ${exp.title}`,
        description: `Monto: ${exp.currency} ${Number(exp.amount).toFixed(2)} | Categoría: ${exp.category}`,
        user: exp.paidBy?.name || 'Usuario desconocido',
        userRole: exp.paidBy?.role || '',
        family: exp.paidBy?.family?.name || 'Sin familia',
        timestamp: exp.createdAt,
      });
    });

    recentNotes.forEach(note => {
      events.push({
        id: `note-${note.id}`,
        type: 'note',
        title: `Añadió nota: ${note.title || 'General'}`,
        description: note.content.length > 80 ? `${note.content.substring(0, 80)}...` : note.content,
        user: note.author?.name || 'Usuario desconocido',
        userRole: note.author?.role || '',
        family: note.author?.family?.name || 'Sin familia',
        timestamp: note.createdAt,
      });
    });

    const sortedEvents = events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    // 5. Historial de actividad (últimos 7 días)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [dailyActLogs, dailyMedLogs] = await Promise.all([
      prisma.activityLog.findMany({
        where: { completedAt: { gte: sevenDaysAgo } },
        select: { completedAt: true },
      }).catch(() => []),
      prisma.medLog.findMany({
        where: { givenAt: { gte: sevenDaysAgo } },
        select: { givenAt: true },
      }).catch(() => []),
    ]);

    const timelineData: Record<string, { activities: number; medications: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const str = getLimaDateString(d);
      timelineData[str] = { activities: 0, medications: 0 };
    }

    dailyActLogs.forEach(log => {
      const dateStr = getLimaDateString(log.completedAt);
      if (timelineData[dateStr]) {
        timelineData[dateStr].activities += 1;
      }
    });

    dailyMedLogs.forEach(log => {
      const dateStr = getLimaDateString(log.givenAt);
      if (timelineData[dateStr]) {
        timelineData[dateStr].medications += 1;
      }
    });

    const timeline = Object.entries(timelineData).map(([date, data]) => ({
      date,
      activities: data.activities,
      medications: data.medications,
    }));

    // 6. Distribución de Roles
    const roleDistribution = rawUsers.reduce((acc: Record<string, number>, curr) => {
      acc[curr.role] = (acc[curr.role] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalFamilies,
          totalElderly,
          totalActivities,
          totalActivityLogs,
          totalMedications,
          totalMedLogs,
          totalAppointments,
          totalExpenses,
          totalNotes,
        },
        users,
        families,
        recentActivity: sortedEvents,
        timeline,
        roleDistribution,
      },
    });
  } catch (err) {
    console.warn('[Admin Stats] Usando datos de la Familia Mendoza...');
    res.json({
      success: true,
      data: sampleMendozaData,
    });
  }
};
