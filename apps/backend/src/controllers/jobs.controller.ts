import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { sendPushNotifications } from '../services/notification.service';

const formatTime = (date: Date | null): string => {
  if (!date) return '';
  try {
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Lima',
    }) + ' (hora local)';
  } catch {
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm} UTC`;
  }
};

/**
 * Job de Vercel Cron para enviar recordatorios de actividades y citas próximas (15 min).
 */
export const runRemindersJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Autorización básica para evitar abuso en producción
    if (
      process.env.NODE_ENV === 'production' &&
      req.headers['x-vercel-cron'] !== '1' &&
      req.query.secret !== process.env.CRON_SECRET
    ) {
      res.status(401).json({ success: false, error: 'No autorizado' });
      return;
    }

    const now = new Date();
    // Buscar items en una ventana de: hace 1 hora hasta dentro de 20 minutos
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const in20Minutes = new Date(now.getTime() + 20 * 60 * 1000);

    // 1. Obtener actividades pendientes sin notificar
    const pendingActivities = await prisma.activity.findMany({
      where: {
        scheduledAt: {
          gte: oneHourAgo,
          lte: in20Minutes,
        },
        status: 'pending',
        reminderSent: false,
        deletedAt: null,
      },
    });

    // 2. Obtener citas programadas sin notificar
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: oneHourAgo,
          lte: in20Minutes,
        },
        status: 'scheduled',
        reminderSent: false,
        deletedAt: null,
      },
    });

    console.log(
      `[Cron Job] Procesando ${pendingActivities.length} actividades y ${pendingAppointments.length} citas.`
    );

    let sentCount = 0;

    // Procesar actividades
    for (const activity of pendingActivities) {
      // Obtener tokens de la familia
      const members = await prisma.familyMember.findMany({
        where: { familyId: activity.familyId, isActive: true },
        select: { pushTokens: { select: { token: true } } },
      });
      const tokens = members.flatMap(m => m.pushTokens.map(t => t.token));

      if (tokens.length > 0) {
        await sendPushNotifications({
          tokens,
          title: `⏱️ Actividad próxima: ${activity.title}`,
          body: `Faltan unos 15 minutos para la actividad programada: ${formatTime(activity.scheduledAt)}`,
          data: { type: 'activity', id: activity.id },
        });
        sentCount++;
      }

      // Marcar como enviada
      await prisma.activity.update({
        where: { id: activity.id },
        data: { reminderSent: true },
      });
    }

    // Procesar citas
    for (const appointment of pendingAppointments) {
      const members = await prisma.familyMember.findMany({
        where: { familyId: appointment.familyId, isActive: true },
        select: { pushTokens: { select: { token: true } } },
      });
      const tokens = members.flatMap(m => m.pushTokens.map(t => t.token));

      if (tokens.length > 0) {
        await sendPushNotifications({
          tokens,
          title: `📅 Cita médica próxima: ${appointment.title}`,
          body: `Recordatorio de cita programada a las ${formatTime(appointment.scheduledAt)}${
            appointment.location ? ` en ${appointment.location}` : ''
          }`,
          data: { type: 'appointment', id: appointment.id },
        });
        sentCount++;
      }

      // Marcar como enviada
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        processedActivities: pendingActivities.length,
        processedAppointments: pendingAppointments.length,
        notificationsSent: sentCount,
      },
    });
  } catch (err) {
    next(err);
  }
};
