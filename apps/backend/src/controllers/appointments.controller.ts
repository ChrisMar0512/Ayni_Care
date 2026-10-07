import { Request, Response, NextFunction } from 'express';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { broadcast } from '../services/realtime.service';
import { CreateAppointmentInput, UpdateAppointmentInput } from '../schemas/appointment.schema';
import { demoStore, DEMO_FAMILY_ID } from '../lib/demo-data';

const VALID_APPOINTMENT_STATUSES: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled', 'rescheduled'];

// GET /api/appointments
export const listAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { status, from, to } = req.query;

    if (familyId === DEMO_FAMILY_ID) {
      let filtered = [...demoStore.appointments];
      if (typeof status === 'string') {
        filtered = filtered.filter((a) => a.status === status);
      }
      res.json({ success: true, data: filtered });
      return;
    }

    if (typeof status === 'string' && !VALID_APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
      res.status(400).json({
        success: false,
        data: null,
        error: `Estado inválido. Valores permitidos: ${VALID_APPOINTMENT_STATUSES.join(', ')}`,
      });
      return;
    }

    const where: Prisma.AppointmentWhereInput = {
      familyId,
      deletedAt: null,
    };

    if (typeof status === 'string') {
      where.status = status as AppointmentStatus;
    }

    if (typeof from === 'string' || typeof to === 'string') {
      where.scheduledAt = {};
      if (typeof from === 'string') {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) where.scheduledAt.gte = fromDate;
      }
      if (typeof to === 'string') {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) where.scheduledAt.lte = toDate;
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ success: true, data: appointments });
  } catch (err) {
    next(err);
  }
};

// POST /api/appointments
export const createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { title, type, scheduledAt, location, doctorName, durationMin, notes } =
      req.validatedBody as CreateAppointmentInput;

    if (familyId === DEMO_FAMILY_ID) {
      const newAppt = {
        id: `appt-${Date.now()}`,
        familyId: DEMO_FAMILY_ID,
        title,
        type,
        scheduledAt: new Date(scheduledAt),
        location: location || null,
        doctorName: doctorName || null,
        durationMin: durationMin || 60,
        notes: notes || null,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      demoStore.appointments.push(newAppt as any);
      res.status(201).json({ success: true, data: newAppt });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        familyId,
        title,
        type,
        scheduledAt: new Date(scheduledAt),
        location,
        doctorName,
        durationMin,
        notes,
      },
    });

    await broadcast(familyId, 'appointment:created', appointment);

    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/appointments/:id
export const updateAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;
    const updates = req.validatedBody as UpdateAppointmentInput;

    if (familyId === DEMO_FAMILY_ID) {
      const appt = demoStore.appointments.find((a) => a.id === id);
      if (!appt) {
        res.status(404).json({ success: false, data: null, error: 'Cita no encontrada' });
        return;
      }
      Object.assign(appt, {
        ...updates,
        scheduledAt: updates.scheduledAt ? new Date(updates.scheduledAt) : appt.scheduledAt,
      });
      res.json({ success: true, data: appt });
      return;
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Cita no encontrada' });
      return;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...updates,
        scheduledAt: updates.scheduledAt ? new Date(updates.scheduledAt) : undefined,
      },
    });

    await broadcast(familyId, 'appointment:updated', appointment);

    res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/appointments/:id — soft delete
export const deleteAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;

    if (familyId === DEMO_FAMILY_ID) {
      const idx = demoStore.appointments.findIndex((a) => a.id === id);
      if (idx !== -1) {
        demoStore.appointments.splice(idx, 1);
      }
      res.json({ success: true, data: null });
      return;
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Cita no encontrada' });
      return;
    }

    await prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await broadcast(familyId, 'appointment:deleted', { id });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
