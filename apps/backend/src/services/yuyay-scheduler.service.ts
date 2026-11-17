import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { dispatchOutboundCall, handleMissedCallAttempt } from './yuyay-call.service';
import { runDailyNightReportJob } from './yuyay-report.service';
import { getLimaClock, getLimaStartOfDay, parseHHmm, LimaClock } from './yuyay-time';

/** Si el servidor estuvo caído o se demoró, todavía se llama hasta 60 min después de la hora programada. */
export const DUE_WINDOW_MINUTES = 60;
/** Espera entre reintentos cuando el adulto mayor no contesta. */
export const RETRY_DELAY_MINUTES = 15;
/** Si una llamada sigue en "calling" después de este tiempo sin webhook, se considera no contestada. */
export const STUCK_CALL_MINUTES = 20;

let lastNightlyReportDate: string | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Compatibilidad con la versión anterior: hora actual en Lima.
 */
export const getLimaCurrentTime = (): LimaClock => getLimaClock();

const minutesSince = (date: Date, now: Date): number =>
  Math.floor((now.getTime() - date.getTime()) / (60 * 1000));

/**
 * Marca una llamada como fallida por un error técnico al marcar (proveedor caído, sin saldo, etc.).
 * No alerta a la familia: es un problema nuestro, no del adulto mayor. Queda en logs para operación.
 */
const markDispatchFailed = async (scheduledCallId: string, elderlyId: string, reason: string): Promise<void> => {
  console.error(`[Yuyay Scheduler] ❌ No se pudo marcar la llamada ${scheduledCallId}: ${reason}`);
  await prisma.scheduledCall.update({
    where: { id: scheduledCallId },
    data: { status: 'failed' },
  });
  await prisma.callLog.create({
    data: {
      scheduledCallId,
      elderlyId,
      status: 'failed',
      symptoms: `Error técnico al marcar: ${reason.slice(0, 200)}`,
    },
  });
};

/**
 * 1. Llamadas del día.
 *
 * Una llamada programada (ej. "08:00") se considera pendiente HOY si todavía no se intentó
 * hoy (lastCallAt nulo o de un día anterior). Así se reinicia sola cada día sin cron extra.
 * Solo se llama a adultos mayores con consentimiento verbal registrado (Ley 29733).
 */
export const processDueScheduledCalls = async (now: Date = new Date()): Promise<number> => {
  try {
    const clock = getLimaClock(now);
    const startOfDay = getLimaStartOfDay(now);
    const notAttemptedToday: Prisma.ScheduledCallWhereInput[] = [
      { lastCallAt: null },
      { lastCallAt: { lt: startOfDay } },
    ];

    const candidates = await prisma.scheduledCall.findMany({
      where: {
        OR: notAttemptedToday,
        elderly: { consentVerbal: true, phone: { not: null } },
      },
      include: { elderly: true },
    });

    let triggeredCount = 0;
    for (const call of candidates) {
      const scheduledMinutes = parseHHmm(call.scheduledTime);
      if (scheduledMinutes === null) {
        console.warn(`[Yuyay Scheduler] Hora inválida "${call.scheduledTime}" en llamada ${call.id}`);
        continue;
      }

      const minutesLate = clock.minutesOfDay - scheduledMinutes;
      if (minutesLate < 0 || minutesLate > DUE_WINDOW_MINUTES) continue;

      // Reclamo atómico: si otro proceso (cron externo u otra instancia) ya la tomó, no se duplica.
      const claim = await prisma.scheduledCall.updateMany({
        where: { id: call.id, OR: notAttemptedToday },
        data: { status: 'calling', retryCount: 0, lastCallAt: now },
      });
      if (claim.count !== 1) continue;

      try {
        await dispatchOutboundCall({
          elderlyId: call.elderlyId,
          scheduledCallId: call.id,
          timeSlot: toTimeSlot(call.timeSlot),
          isInduction: false,
        });
        triggeredCount++;
      } catch (err) {
        await markDispatchFailed(call.id, call.elderlyId, errorMessage(err));
      }
    }

    return triggeredCount;
  } catch (dbErr) {
    console.warn('[Yuyay Scheduler] Aviso al buscar llamadas pendientes:', errorMessage(dbErr));
    return 0;
  }
};

/**
 * 2. Reintentos (cada 15 min, máximo 3 intentos en total) y llamadas colgadas.
 *
 * - "no_answer" con menos de 3 intentos → se vuelve a marcar pasados 15 minutos.
 * - "calling" por más de 20 minutos sin webhook → se trata como no contestada
 *   (si no, la llamada quedaría colgada para siempre y nunca se alertaría a la familia).
 * Al 3er intento sin respuesta, handleMissedCallAttempt alerta al cuidador.
 */
export const processRetriesAndMissedCalls = async (now: Date = new Date()): Promise<number> => {
  try {
    const startOfDay = getLimaStartOfDay(now);

    const stuckCalls = await prisma.scheduledCall.findMany({
      where: {
        status: 'calling',
        lastCallAt: { gte: startOfDay, lte: new Date(now.getTime() - STUCK_CALL_MINUTES * 60 * 1000) },
      },
    });
    for (const call of stuckCalls) {
      console.warn(`[Yuyay Scheduler] ⏳ Llamada ${call.id} sin respuesta del proveedor; se trata como no contestada.`);
      await handleMissedCallAttempt(call.id);
    }

    const missedCalls = await prisma.scheduledCall.findMany({
      where: {
        status: 'no_answer',
        retryCount: { gte: 1, lt: 3 },
        lastCallAt: { gte: startOfDay },
      },
    });

    let retryTriggered = 0;
    for (const call of missedCalls) {
      if (!call.lastCallAt || minutesSince(call.lastCallAt, now) < RETRY_DELAY_MINUTES) continue;

      const claim = await prisma.scheduledCall.updateMany({
        where: { id: call.id, status: 'no_answer', retryCount: call.retryCount },
        data: { status: 'calling', lastCallAt: now },
      });
      if (claim.count !== 1) continue;

      console.log(`[Yuyay Scheduler] 🔁 Reintento #${call.retryCount + 1} para llamada ${call.id}`);
      try {
        await dispatchOutboundCall({
          elderlyId: call.elderlyId,
          scheduledCallId: call.id,
          timeSlot: toTimeSlot(call.timeSlot),
          isInduction: false,
        });
        retryTriggered++;
      } catch (err) {
        await markDispatchFailed(call.id, call.elderlyId, errorMessage(err));
      }
    }

    return retryTriggered;
  } catch (dbErr) {
    console.warn('[Yuyay Scheduler] Aviso al verificar reintentos:', errorMessage(dbErr));
    return 0;
  }
};

/**
 * 3. Reporte consolidado nocturno a las 20:30 (hora de Lima).
 *
 * Nota: el control de "ya se envió hoy" vive en memoria. Funciona con UNA sola instancia
 * del servidor y sin combinar el worker interno con un cron externo.
 */
export const processNightlyConsolidatedReport = async (now: Date = new Date()): Promise<boolean> => {
  try {
    const { hour, minute, dateStr } = getLimaClock(now);
    const isNightlyWindow = hour === 20 && minute >= 30 && minute <= 35;

    if (isNightlyWindow && lastNightlyReportDate !== dateStr) {
      console.log('[Yuyay Scheduler] 🌙 Ejecutando reporte nocturno oficial a las 20:30...');
      lastNightlyReportDate = dateStr;
      await runDailyNightReportJob();
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[Yuyay Scheduler] Aviso al procesar reporte nocturno:', errorMessage(err));
    return false;
  }
};

/**
 * 4. Ciclo completo de supervisión. Lo invoca el worker interno o un cron externo.
 */
export const runSchedulerCycle = async () => {
  const now = new Date();
  const { timeStr, dateStr } = getLimaClock(now);

  const dueCalls = await processDueScheduledCalls(now);
  const retries = await processRetriesAndMissedCalls(now);
  const nightlyReportSent = await processNightlyConsolidatedReport(now);

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
 * 5. Worker de background para servidores persistentes (Railway / Node local).
 * Se puede desactivar con YUYAY_SCHEDULER_ENABLED=false (ej. si se usa solo cron externo).
 */
export const initYuyayBackgroundWorker = () => {
  if (process.env.VERCEL) {
    console.log('[Yuyay Scheduler] Entorno Serverless (Vercel) detectado: el worker continuo se delega al Cron HTTP.');
    return;
  }
  if (process.env.YUYAY_SCHEDULER_ENABLED === 'false') {
    console.log('[Yuyay Scheduler] Worker interno desactivado por YUYAY_SCHEDULER_ENABLED=false.');
    return;
  }

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('[Yuyay Scheduler] ⏰ Worker autónomo de Yuyay iniciado (revisión cada 60s en hora de Lima).');

  schedulerInterval = setInterval(async () => {
    try {
      await runSchedulerCycle();
    } catch (err) {
      console.error('[Yuyay Scheduler Worker] Error en ciclo:', errorMessage(err));
    }
  }, 60 * 1000);
};

const toTimeSlot = (value: string | null): 'mañana' | 'tarde' | 'noche' =>
  value === 'tarde' || value === 'noche' ? value : 'mañana';

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
