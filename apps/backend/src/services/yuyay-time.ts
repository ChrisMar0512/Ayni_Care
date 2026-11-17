/**
 * Utilidades de hora para Yuyay.
 *
 * El servidor puede correr en UTC (Railway, Render, Vercel), así que todo cálculo de
 * "hoy" o "hora actual" debe hacerse explícitamente en America/Lima.
 * Perú no usa horario de verano: Lima es siempre UTC-05:00.
 */

export const LIMA_TZ = 'America/Lima';
const LIMA_UTC_OFFSET = '-05:00';

export interface LimaClock {
  /** "HH:mm" en 24 horas, ej. "08:05" */
  timeStr: string;
  /** "YYYY-MM-DD" */
  dateStr: string;
  hour: number;
  minute: number;
  /** Minutos transcurridos desde la medianoche de Lima */
  minutesOfDay: number;
}

export const getLimaClock = (now: Date = new Date()): LimaClock => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);

  return {
    timeStr: `${get('hour')}:${get('minute')}`,
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
  };
};

/** Instante (UTC) en que empezó el día actual en Lima. */
export const getLimaStartOfDay = (now: Date = new Date()): Date => {
  const { dateStr } = getLimaClock(now);
  return new Date(`${dateStr}T00:00:00${LIMA_UTC_OFFSET}`);
};

/** Convierte "HH:mm" a minutos desde medianoche. Devuelve null si el formato es inválido. */
export const parseHHmm = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

export const getTimeSlotForHHmm = (time: string): 'mañana' | 'tarde' | 'noche' => {
  const minutes = parseHHmm(time) ?? 0;
  if (minutes < 12 * 60) return 'mañana';
  if (minutes < 18 * 60) return 'tarde';
  return 'noche';
};

export const formatLimaTime = (date: Date): string =>
  date.toLocaleTimeString('es-PE', {
    timeZone: LIMA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

export const formatLimaLongDate = (date: Date): string =>
  date.toLocaleDateString('es-PE', {
    timeZone: LIMA_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
