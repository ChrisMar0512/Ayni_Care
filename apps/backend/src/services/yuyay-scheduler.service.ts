import { prisma } from '../prisma/client';
import { dispatchOutboundCall, handleMissedCallAttempt } from './yuyay-call.service';
import { runDailyNightReportJob } from './yuyay-report.service';

let lastNightlyReportDate: string | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Obtiene la hora actual formateada en Lima (HH:mm) y la fecha (YYYY-MM-DD)
 */
export const getLimaCurrentTime = (): { timeStr: string; dateStr: string; hour: number; minute: number } => {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeStr = timeFormatter.format(now);
  const dateStr = dateFormatter.format(now);
  const [hourStr, minStr] = timeStr.split(':');

  return {
    timeStr,
    dateStr,
    hour: parseInt(hourStr, 10),
    minute: parseInt(minStr, 10),
  };
};

/**
 * 1. Procesa llamadas programadas para la hora actual
 */
export const processDueScheduledCalls = async (): Promise<number> => {
  try {
    const { timeStr } = getLimaCurrentTime();

    // Buscar llamadas pendientes en la hora actual
    const dueCalls = await prisma.scheduledCall.findMany({
      where: {
        status: 'pending',
        scheduledTime: timeStr,
      },
      include: {
        elderly: true,
      },
    });

    let triggeredCount = 0;
    for (const call of dueCalls) {
      if (!call.elderly.phone) continue;

      try {
        await dispatchOutboundCall({
          elderlyId: call.elderlyId,
          scheduledCallId: call.id,
          timeSlot: (call.timeSlot as any) || 'mañana',
          isInduction: false,
        });
        triggeredCount++;
      } catch (err: any) {
        console.error(`[Yuyay Scheduler] Error llamando a ${call.elderly.name}:`, err.message);
      }
    }

    return triggeredCount;
  } catch (dbErr: any) {
    console.warn('[Yuyay Scheduler] Aviso al buscar llamadas pendientes:', dbErr.message || dbErr);
    return 0;
  }
};

/**
 * 2. Procesa reintentos espaciados (a los 15 y 30 minutos) y protocolo de 3er intento
 */
export const processRetriesAndMissedCalls = async (): Promise<number> => {
  try {
    const now = new Date();

    // Llamadas sin contestar
    const missedCalls = await prisma.scheduledCall.findMany({
      where: {
        status: 'no_answer',
        retryCount: { lt: 3 },
      },
    });

    let retryTriggered = 0;

    for (const call of missedCalls) {
      if (!call.lastCallAt) continue;

      const elapsedMs = now.getTime() - new Date(call.lastCallAt).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

      // Si ya pasaron 15 minutos (intento 1) o 30 minutos (intento 2)
      const shouldRetry = (call.retryCount === 1 && elapsedMinutes >= 15) || (call.retryCount === 2 && elapsedMinutes >= 30);

      if (shouldRetry) {
        try {
          console.log(`[Yuyay Scheduler] 🔁 Ejecutando reintento #${call.retryCount + 1} para llamada ${call.id}`);
          await dispatchOutboundCall({
            elderlyId: call.elderlyId,
            scheduledCallId: call.id,
            timeSlot: (call.timeSlot as any) || 'mañana',
            isInduction: false,
          });
          retryTriggered++;
        } catch (err: any) {
          console.error(`[Yuyay Scheduler] Error en reintento:`, err.message);
        }
      } else if (call.retryCount >= 2 && elapsedMinutes >= 45) {
        // Pasó el tiempo límite del último reintento sin contestar -> cerrar y disparar alerta roja
        await handleMissedCallAttempt(call.id);
      }
    }

    return retryTriggered;
  } catch (dbErr: any) {
    console.warn('[Yuyay Scheduler] Aviso al verificar reintentos:', dbErr.message || dbErr);
    return 0;
  }
};

/**
 * 3. Dispara automáticamente el reporte consolidado nocturno a las 20:30 (hora de Lima)
 */
export const processNightlyConsolidatedReport = async (): Promise<boolean> => {
  try {
    const { hour, minute, dateStr } = getLimaCurrentTime();

    // Ventana de las 20:30 (8:30 PM) a las 20:35
    const isNightlyWindow = hour === 20 && minute >= 30 && minute <= 35;

    if (isNightlyWindow && lastNightlyReportDate !== dateStr) {
      console.log(`[Yuyay Scheduler] 🌙 Ejecutando reporte nocturno oficial a las 20:30...`);
      lastNightlyReportDate = dateStr;
      await runDailyNightReportJob();
      return true;
    }

    return false;
  } catch (err: any) {
    console.warn('[Yuyay Scheduler] Aviso al procesar reporte nocturno:', err.message || err);
    return false;
  }
};

/**
 * 4. Ciclo completo de supervisión del Scheduler
 * Puede invocarse mediante cron externo (Vercel Cron, Railway) o internamente.
 */
export const runSchedulerCycle = async () => {
  const { timeStr, dateStr } = getLimaCurrentTime();

  const dueCalls = await processDueScheduledCalls();
  const retries = await processRetriesAndMissedCalls();
  const nightlyReportSent = await processNightlyConsolidatedReport();

  return {
    status: 'ok',
    currentTimeLima: timeStr,
    currentDateLima: dateStr,
    dueCallsTriggered: dueCalls,
    retriesTriggered: retries,
    nightlyReportSent,
  };
};

/**
 * 5. Inicializador del worker de background para servidores persistentes (Railway / Node local)
 */
export const initYuyayBackgroundWorker = () => {
  if (process.env.VERCEL) {
    console.log('[Yuyay Scheduler] Entorno Serverless (Vercel) detectado: el worker continuo se delega al Cron HTTP.');
    return;
  }

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('[Yuyay Scheduler] ⏰ Worker autónomo de Yuyay iniciado (revisión cada 60s en hora de Lima).');

  schedulerInterval = setInterval(async () => {
    try {
      await runSchedulerCycle();
    } catch (err: any) {
      console.error('[Yuyay Scheduler Worker] Error en ciclo:', err.message || err);
    }
  }, 60 * 1000);
};
