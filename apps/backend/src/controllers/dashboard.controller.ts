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

const shouldMedicationRunOnDate = (frequency: string, startDate: Date, targetDateStr: string): boolean => {
  const freq = frequency.toLowerCase().trim();
  
  // Convert targetDate (YYYY-MM-DD) to UTC midnight
  const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);
  
  // Normalize start date to UTC midnight
  const startD = new Date(startDate);
  startD.setUTCHours(0, 0, 0, 0);

  // If target date is before the medication's start date, it shouldn't show
  if (targetDate.getTime() < startD.getTime()) {
    return false;
  }

  // Calculate difference in calendar days
  const timeDiff = targetDate.getTime() - startD.getTime();
  const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

  // 1. Daily / Every day
  if (
    freq.includes('diario') ||
    freq.includes('diaria') ||
    freq.includes('todos') ||
    freq.includes('cada día') ||
    freq.includes('cada dia') ||
    freq.includes('cada 8 horas') ||
    freq.includes('cada 12 horas') ||
    freq.includes('cada 6 horas') ||
    freq.includes('cada 4 horas') ||
    freq.includes('vez al día') ||
    freq.includes('vez al dia')
  ) {
    return true;
  }

  // 2. Interdiario / Dia de por medio / Every other day (every 2 days)
  if (
    freq.includes('interdiario') ||
    freq.includes('dia de por medio') ||
    freq.includes('día de por medio') ||
    freq.includes('dia por medio') ||
    freq.includes('día por medio') ||
    freq.includes('dia si dia no') ||
    freq.includes('día sí día no')
  ) {
    return dayDiff % 2 === 0;
  }

  // 3. Every X days (e.g. "cada 3 días")
  const everyXDaysMatch = freq.match(/cada\s+(\d+)\s+días/) || freq.match(/cada\s+(\d+)\s+dias/);
  if (everyXDaysMatch) {
    const days = parseInt(everyXDaysMatch[1], 10);
    if (days > 0) {
      return dayDiff % days === 0;
    }
  }

  // 4. Specific days of the week (e.g., "lunes, miércoles, viernes")
  const weekdayNames: Record<string, number> = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
    domingo: 0,
    lun: 1,
    mar: 2,
    mie: 3,
    mié: 3,
    jue: 4,
    vie: 5,
    sab: 6,
    sáb: 6,
    dom: 0,
  };

  const targetDayOfWeek = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

  let hasWeekdayMatch = false;
  let specifiesWeekdays = false;

  for (const [dayName, dayNum] of Object.entries(weekdayNames)) {
    // Check if the weekday name exists as a separate word or part of comma-separated list
    // Simple check is usually enough here
    if (freq.includes(dayName)) {
      specifiesWeekdays = true;
      if (targetDayOfWeek === dayNum) {
        hasWeekdayMatch = true;
      }
    }
  }

  if (specifiesWeekdays) {
    return hasWeekdayMatch;
  }

  // Fallback: Default to true (always show) if the custom text doesn't match known patterns
  return true;
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

    let dateStr: string;

    if (typeof date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          data: null,
          error: 'Formato de fecha inválido. Usa YYYY-MM-DD',
        });
        return;
      }
      dateStr = date;
    } else {
      // Obtener fecha actual en la zona horaria de Perú (UTC-5)
      const nowPeru = new Date(Date.now() - 5 * 60 * 60 * 1000);
      dateStr = nowPeru.toISOString().split('T')[0];
    }

    // Calcular límites UTC para el día local en Perú (UTC-5)
    // 00:00:00 de hoy en Perú = 05:00:00 UTC de hoy
    // 23:59:59.999 de hoy en Perú = 04:59:59.999 UTC de mañana
    const start = new Date(`${dateStr}T05:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

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
      // Validar si el medicamento corresponde al día consultado
      if (!shouldMedicationRunOnDate(med.frequency, med.startDate, dateStr)) {
        continue;
      }

      // Inicializar slots de este medicamento como pendientes
      const slots = med.times.map(t => ({
        time: t,
        status: 'pending',
        completedBy: null as any,
        completedAt: null as Date | null,
        notes: null as string | null
      }));

      // Mapear cada toma (log) de hoy al slot más cercano
      for (const log of med.logs) {
        const logLocalTimeStr = getLocalTimeStr(log.givenAt);
        const logMinutes = parseTimeToMinutes(logLocalTimeStr);
        
        let closestSlotIdx = -1;
        let minDiff = Infinity;

        for (let i = 0; i < slots.length; i++) {
          const slotMinutes = parseTimeToMinutes(slots[i].time);
          const diff = Math.abs(logMinutes - slotMinutes);
          if (diff < minDiff) {
            minDiff = diff;
            closestSlotIdx = i;
          }
        }

        if (closestSlotIdx !== -1) {
          const slot = slots[closestSlotIdx];
          slot.status = log.skipped ? 'skipped' : 'completed';
          slot.completedBy = log.givenBy as any;
          slot.completedAt = log.givenAt as any;
          slot.notes = log.notes;
        }
      }

      // Añadir cada slot mapeado al listado de items del dashboard
      for (const slot of slots) {
        medicationItems.push({
          id: `med-${med.id}-${slot.time}`,
          type: 'medication',
          title: `💊 Dar ${med.name}`,
          time: slot.time,
          status: slot.status,
          subtitle: `Dosis: ${med.dosage}${med.form ? ` (${med.form})` : ''} | Frecuencia: ${med.frequency}`,
          originalId: med.id,
          priority: 'normal',
          completedBy: slot.completedBy,
          completedAt: slot.completedAt,
          notes: slot.notes,
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
