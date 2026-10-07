import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { broadcast } from '../services/realtime.service';
import { demoStore, DEMO_FAMILY_ID } from '../lib/demo-data';
import {
  CreateMedicationInput,
  UpdateMedicationInput,
  AdministerMedicationInput,
} from '../schemas/medication.schema';

// GET /api/medications — medicamentos activos de la familia con logs del día
export const listMedications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;

    if (familyId === DEMO_FAMILY_ID) {
      res.json({ success: true, data: demoStore.medications });
      return;
    }

    try {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      const medications = await prisma.medication.findMany({
        where: {
          familyId,
          deletedAt: null,
          isActive: true,
        },
        include: {
          logs: {
            where: { givenAt: { gte: startOfToday } },
            orderBy: { givenAt: 'desc' },
            include: {
              givenBy: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      });

      res.json({ success: true, data: medications });
    } catch (dbErr) {
      console.warn('[Medications] BD no accesible, usando demoStore...');
      res.json({ success: true, data: demoStore.medications });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/medications — crea un medicamento
export const createMedication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { name, dosage, form, frequency, times, instructions, startDate, endDate, stock } =
      req.validatedBody as CreateMedicationInput;

    const medication = await prisma.medication.create({
      data: {
        familyId,
        name,
        dosage,
        form,
        frequency,
        times,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        stock,
      },
    });

    await broadcast(familyId, 'medication:created', medication);

    res.status(201).json({ success: true, data: medication });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/medications/:id — actualiza un medicamento
export const updateMedication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;
    const updates = req.validatedBody as UpdateMedicationInput;

    const existing = await prisma.medication.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Medicamento no encontrado' });
      return;
    }

    const medication = await prisma.medication.update({
      where: { id },
      data: {
        ...updates,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        endDate: updates.endDate !== undefined
          ? updates.endDate === null ? null : new Date(updates.endDate)
          : undefined,
      },
    });

    await broadcast(familyId, 'medication:updated', medication);

    res.json({ success: true, data: medication });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/medications/:id/administer — registra administración (o salto) de dosis
export const administerMedication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId, memberId } = req.user;
    const { id } = req.params;
    const { skipped, skipReason, notes } = req.validatedBody as AdministerMedicationInput;

    const demoMed = demoStore.medications.find((m) => m.id === id);
    if (familyId === DEMO_FAMILY_ID || demoMed) {
      const med = demoMed || demoStore.medications[0];
      if (!skipped && med.stock !== null && med.stock > 0) {
        med.stock = Math.max(0, med.stock - 1);
      }
      const newLog = {
        id: `mlog-${Date.now()}`,
        medicationId: med.id,
        givenById: memberId,
        givenAt: new Date(),
        skipped: Boolean(skipped),
        skipReason: skipReason || null,
        notes: notes || null,
        givenBy: { id: memberId, name: 'Carlos Mendoza' },
      };
      med.logs.unshift(newLog as any);
      res.json({ success: true, data: { medication: med, log: newLog } });
      return;
    }

    const existing = await prisma.medication.findFirst({
      where: { id, familyId, deletedAt: null, isActive: true },
      select: { id: true, stock: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Medicamento no encontrado o inactivo' });
      return;
    }

    const log = await prisma.$transaction(async (tx) => {
      const newLog = await tx.medLog.create({
        data: {
          medicationId: id,
          givenById: memberId,
          skipped,
          skipReason,
          notes,
        },
        include: {
          givenBy: { select: { id: true, name: true } },
        },
      });

      if (!skipped && existing.stock !== null && existing.stock > 0) {
        await tx.medication.update({
          where: { id },
          data: { stock: { decrement: 1 } },
        });
      }

      return newLog;
    });

    const medication = await prisma.medication.findUnique({
      where: { id },
      select: { id: true, name: true, stock: true, isActive: true },
    });

    await broadcast(familyId, 'medication:administered', { log, medication });

    res.status(201).json({ success: true, data: { log, medication } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/medications/:id — soft delete
export const deleteMedication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;

    const existing = await prisma.medication.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Medicamento no encontrado' });
      return;
    }

    await prisma.medication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await broadcast(familyId, 'medication:deleted', { id });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
