import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

const getLocalTimeStr = (date: Date): string => {
  try {
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Lima',
    });
  } catch {
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
};

const parseTimeToMinutes = (timeStr: string): number => {
  const [hh, mm] = timeStr.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
};

/**
 * GET /api/dashboard/daily?date=YYYY-MM-DD
 * Devuelve el checklist unificado de Actividades, Tomas de Medicamentos y Citas de la Agenda para una fecha.
 */
export const getDailyDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { date } = req.query;

    let start: Date;
    let end: Date;

    if (typeof date === 'string') {
      const day = new Date(date);
      if (isNaN(day.getTime())) {
        res.status(400).json({
          success: false,
          data: null,
          error: 'Formato de fecha inválido. Usa YYYY-MM-DD',
        });
        return;
      }
      start = new Date(day);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(day);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      const day = new Date();
      start = new Date(day);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(day);
      end.setUTCHours(23, 59, 59, 999);
    }

    // 1. Obtener Actividades del día
    const activities = await prisma.activity.findMany({
      where: {
        familyId,
        deletedAt: null,
        scheduledAt: { gte: start, lte: end },
      },
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

    // 2. Obtener Citas de la Agenda del día
    const appointments = await prisma.appointment.findMany({
      where: {
        familyId,
        deletedAt: null,
        scheduledAt: { gte: start, lte: end },
      },
    });

    // 3. Obtener Medicamentos activos hoy
    const medications = await prisma.medication.findMany({
      where: {
        familyId,
        isActive: true,
        deletedAt: null,
        startDate: { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      include: {
        logs: {
          where: {
            givenAt: { gte: start, lte: end },
          },
          include: {
            givenBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    // ─── MAPEADO DE ITEMS ───────────────────────────────────

    // Actividades
    const activityItems = activities.map(act => {
      const lastLog = act.logs[0];
      let timeStr = '';
      if (act.scheduledAt) {
        timeStr = getLocalTimeStr(act.scheduledAt);
      }

      return {
        id: act.id,
        type: 'activity',
        title: act.title,
        time: timeStr,
        status: act.status, // pending, in_progress, completed, etc.
        subtitle: act.assignedTo ? `Asignado/a a: ${act.assignedTo.name}` : undefined,
        originalId: act.id,
        priority: act.priority,
        assignedTo: act.assignedTo,
        completedBy: lastLog ? lastLog.completedBy : null,
        completedAt: lastLog ? lastLog.completedAt : null,
        notes: lastLog ? lastLog.notes : null,
      };
    });

    // Citas
    const appointmentItems = appointments.map(appt => {
      const timeStr = getLocalTimeStr(appt.scheduledAt);
      let status: 'pending' | 'completed' | 'cancelled' = 'pending';
      if (appt.status === 'completed') status = 'completed';
      else if (appt.status === 'cancelled') status = 'cancelled';

      return {
        id: appt.id,
        type: 'appointment',
        title: `📅 Cita: ${appt.title}`,
        time: timeStr,
        status,
        subtitle:
          [
            appt.doctorName ? `Médico: ${appt.doctorName}` : null,
            appt.location ? `Lugar: ${appt.location}` : null,
            appt.notes ? `Notas: ${appt.notes}` : null,
          ]
            .filter(Boolean)
            .join(' | ') || 'Cita programada',
        originalId: appt.id,
        priority: appt.type === 'medical' ? 'urgent' : 'normal',
        location: appt.location,
        doctorName: appt.doctorName,
        notes: appt.notes,
      };
    });

    // Tomas de Medicamentos
    const medicationItems: any[] = [];
    for (const med of medications) {
      for (const slotTimeStr of med.times) {
        const slotMinutes = parseTimeToMinutes(slotTimeStr);
        let matchedLog: any = null;
        let minDiff = Infinity;

        // Buscar el log más cercano a este slot
        for (const log of med.logs) {
          const logLocalTimeStr = getLocalTimeStr(log.givenAt);
          const logMinutes = parseTimeToMinutes(logLocalTimeStr);
          const diff = Math.abs(logMinutes - slotMinutes);
          if (diff < minDiff) {
            minDiff = diff;
            matchedLog = log;
          }
        }

        // Tolerancia de 3 horas (180 minutos)
        const isMatched = minDiff <= 180;
        let status = 'pending';
        if (isMatched && matchedLog) {
          status = matchedLog.skipped ? 'skipped' : 'completed';
        }

        medicationItems.push({
          id: `med-${med.id}-${slotTimeStr}`,
          type: 'medication',
          title: `💊 Dar ${med.name}`,
          time: slotTimeStr,
          status,
          subtitle: `Dosis: ${med.dosage}${med.form ? ` (${med.form})` : ''} | Frecuencia: ${med.frequency}`,
          originalId: med.id,
          priority: 'normal',
          completedBy: isMatched && matchedLog ? matchedLog.givenBy : null,
          completedAt: isMatched && matchedLog ? matchedLog.givenAt : null,
          notes: isMatched && matchedLog ? matchedLog.notes : null,
        });
      }
    }

    // Unificar y ordenar cronológicamente
    const allItems = [...activityItems, ...appointmentItems, ...medicationItems].sort((a, b) => {
      // Actividades sin hora programada van al principio (como tareas del día)
      if (!a.time && b.time) return -1;
      if (a.time && !b.time) return 1;
      if (!a.time && !b.time) return 0;
      return a.time.localeCompare(b.time);
    });

    res.json({
      success: true,
      data: allItems,
    });
  } catch (err) {
    next(err);
  }
};
