import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { broadcast } from '../services/realtime.service';
import { sendPushNotifications } from '../services/notification.service';
import { demoStore, DEMO_FAMILY_ID } from '../lib/demo-data';
import {
  CreateActivityInput,
  UpdateActivityInput,
  CompleteActivityInput,
} from '../schemas/activity.schema';

function mapAppointmentToActivity(appt: any): any {
  return {
    id: appt.id,
    familyId: appt.familyId,
    title: `📅 Cita: ${appt.title}`,
    description: [
      appt.doctorName ? `Médico: ${appt.doctorName}` : null,
      appt.location ? `Lugar: ${appt.location}` : null,
      appt.notes ? `Notas: ${appt.notes}` : null
    ].filter(Boolean).join(' | ') || 'Cita programada',
    scheduledAt: appt.scheduledAt,
    status: appt.status === 'completed' ? 'completed' : 'pending',
    priority: appt.type === 'medical' ? 'urgent' : 'normal',
    assignedTo: null,
    isAppointment: true,
    logs: appt.status === 'completed' ? [{
      id: appt.id,
      completedAt: appt.updatedAt,
      notes: null,
      completedBy: null
    }] : []
  };
}

// GET /api/activities — lista actividades de la familia (no eliminadas)
// Query params: ?assignedToId=UUID  ?date=YYYY-MM-DD
export const listActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;

    if (familyId === DEMO_FAMILY_ID) {
      res.json({ success: true, data: demoStore.activities });
      return;
    }
    const { assignedToId, date } = req.query;

    const where: Prisma.ActivityWhereInput = {
      familyId,
      deletedAt: null,
    };

    if (typeof assignedToId === 'string') {
      where.assignedToId = assignedToId;
    }

    let start: Date | undefined;
    let end: Date | undefined;

    if (typeof date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ success: false, data: null, error: 'Formato de fecha inválido. Usa YYYY-MM-DD' });
        return;
      }
      // Calcular límites UTC para el día local (UTC-5)
      start = new Date(`${date}T05:00:00.000Z`);
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      where.scheduledAt = { gte: start, lte: end };
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        logs: {
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            completedAt: true,
            notes: true,
            completedBy: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });

    let mappedAppointments: any[] = [];
    if (typeof date === 'string' && start && end) {
      // Buscar citas agendadas para el mismo día
      const appointments = await prisma.appointment.findMany({
        where: {
          familyId,
          deletedAt: null,
          scheduledAt: { gte: start, lte: end }
        },
        orderBy: { scheduledAt: 'asc' }
      });
      mappedAppointments = appointments.map(mapAppointmentToActivity);
    }

    const allItems = [...activities, ...mappedAppointments].sort((a, b) => {
      // Ordenar por urgencia de prioridad primero
      const priorityMap: Record<string, number> = { urgent: 3, normal: 2, low: 1 };
      const aPriority = priorityMap[a.priority] || 2;
      const bPriority = priorityMap[b.priority] || 2;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      // Ordenar por hora programada
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return aTime - bTime;
    });

    res.json({ success: true, data: allItems });
  } catch (err) {
    next(err);
  }
};

// POST /api/activities — crea una actividad
export const createActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { title, description, scheduledAt, assignedToId, recurrence, priority } =
      req.validatedBody as CreateActivityInput;

    if (familyId === DEMO_FAMILY_ID) {
      const newAct = {
        id: `act-${Date.now()}`,
        familyId: DEMO_FAMILY_ID,
        title,
        description: description || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        assignedToId: assignedToId || 'dev-member-id',
        recurrence: recurrence || 'once',
        priority: priority || 'normal',
        status: 'pending',
        assignedTo: { id: assignedToId || 'dev-member-id', name: 'Carlos Mendoza' },
        logs: [],
        createdAt: new Date(),
      };
      demoStore.activities.unshift(newAct as any);
      res.status(201).json({ success: true, data: newAct });
      return;
    }

    if (assignedToId) {
      const member = await prisma.familyMember.findFirst({
        where: { id: assignedToId, familyId, isActive: true },
        select: { id: true },
      });
      if (!member) {
        res.status(400).json({ success: false, data: null, error: 'El miembro asignado no pertenece a esta familia' });
        return;
      }
    }

    const activity = await prisma.activity.create({
      data: {
        familyId,
        title,
        description,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        assignedToId,
        recurrence,
        priority,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await broadcast(familyId, 'activity:created', activity);

    // Enviar notificaciones push a los demás familiares
    try {
      const otherMembers = await prisma.familyMember.findMany({
        where: {
          familyId,
          userId: { not: req.user.id },
          isActive: true,
        },
        select: {
          pushTokens: {
            select: {
              token: true,
            },
          },
        },
      });
      const otherTokens = otherMembers.flatMap(m => m.pushTokens.map(t => t.token));
      if (otherTokens.length > 0) {
        const creatorName = await prisma.familyMember.findUnique({
          where: { userId: req.user.id },
          select: { name: true },
        }).then(m => m?.name || 'Un familiar');

        await sendPushNotifications({
          tokens: otherTokens,
          title: `🆕 Nueva actividad: ${activity.title}`,
          body: `${creatorName} agregó la actividad "${activity.title}".`,
          data: { type: 'activity', id: activity.id },
        });
      }
    } catch (pushErr) {
      console.error('[activities.controller] Error al enviar notificaciones de creación:', pushErr);
    }

    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/activities/:id — actualiza una actividad
export const updateActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;
    const updates = req.validatedBody as UpdateActivityInput;

    if (familyId === DEMO_FAMILY_ID) {
      const act = demoStore.activities.find((a) => a.id === id);
      if (act) {
        Object.assign(act, updates);
        res.json({ success: true, data: act });
        return;
      }
    }

    const existing = await prisma.activity.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Actividad no encontrada' });
      return;
    }

    if (updates.assignedToId) {
      const member = await prisma.familyMember.findFirst({
        where: { id: updates.assignedToId, familyId, isActive: true },
        select: { id: true },
      });
      if (!member) {
        res.status(400).json({ success: false, data: null, error: 'El miembro asignado no pertenece a esta familia' });
        return;
      }
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...updates,
        scheduledAt: updates.scheduledAt ? new Date(updates.scheduledAt) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await broadcast(familyId, 'activity:updated', activity);

    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/activities/:id/complete — marca una actividad o cita como completada
export const completeActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId, memberId } = req.user;
    const { id } = req.params;
    const { notes } = req.validatedBody as CompleteActivityInput;

    if (familyId === DEMO_FAMILY_ID) {
      const act = demoStore.activities.find((a) => a.id === id);
      if (act) {
        act.status = 'completed';
        const log = {
          id: `log-${Date.now()}`,
          completedAt: new Date().toISOString(),
          notes: notes || null,
          completedBy: { id: memberId, name: 'Carlos Mendoza' },
        };
        (act as any).logs = [log];
        res.json({ success: true, data: { activity: act, log } });
        return;
      }

      const appt = demoStore.appointments.find((a) => a.id === id);
      if (appt) {
        appt.status = 'completed';
        res.json({ success: true, data: { activity: mapAppointmentToActivity(appt), log: null } });
        return;
      }
    }

    const existing = await prisma.activity.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!existing) {
      // Intentar buscar como Cita (Appointment)
      const appointment = await prisma.appointment.findFirst({
        where: { id, familyId, deletedAt: null },
      });

      if (!appointment) {
        res.status(404).json({ success: false, data: null, error: 'Actividad o cita no encontrada' });
        return;
      }

      if (appointment.status === 'completed') {
        res.status(400).json({ success: false, data: null, error: 'La cita ya fue completada' });
        return;
      }

      const updatedAppt = await prisma.appointment.update({
        where: { id },
        data: { status: 'completed' }
      });

      const mapped = mapAppointmentToActivity(updatedAppt);
      const result = { activity: mapped, log: null };

      await broadcast(familyId, 'activity:completed', result);
      res.json({ success: true, data: result });
      return;
    }

    if (existing.status === 'completed') {
      res.status(400).json({ success: false, data: null, error: 'La actividad ya fue completada' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.activityLog.create({
        data: {
          activityId: id,
          completedById: memberId,
          notes,
        },
        include: {
          completedBy: { select: { id: true, name: true } },
        },
      });

      const activity = await tx.activity.update({
        where: { id },
        data: { status: 'completed' },
        include: {
          assignedTo: { select: { id: true, name: true } },
          logs: {
            orderBy: { completedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              completedAt: true,
              notes: true,
              completedBy: { select: { id: true, name: true } },
            },
          },
        },
      });

      return { activity, log };
    });

    await broadcast(familyId, 'activity:completed', result);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/activities/:id — soft delete
export const deleteActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;

    if (familyId === DEMO_FAMILY_ID) {
      demoStore.activities = demoStore.activities.filter((a) => a.id !== id);
      res.json({ success: true, data: null });
      return;
    }

    const existing = await prisma.activity.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      // Intentar buscar como Cita (Appointment)
      const appointment = await prisma.appointment.findFirst({
        where: { id, familyId, deletedAt: null },
        select: { id: true },
      });

      if (!appointment) {
        res.status(404).json({ success: false, data: null, error: 'Actividad o cita no encontrada' });
        return;
      }

      await prisma.appointment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await broadcast(familyId, 'activity:deleted', { id });
      res.json({ success: true, data: null });
      return;
    }

    await prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await broadcast(familyId, 'activity:deleted', { id });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
