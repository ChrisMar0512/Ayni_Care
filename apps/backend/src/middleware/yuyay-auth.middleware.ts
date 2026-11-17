import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Protección de los endpoints de Yuyay.
 *
 * - Endpoints internos (disparar llamadas, contexto clínico, preferencias, reportes):
 *   `Authorization: Bearer <YUYAY_ADMIN_TOKEN>`
 * - Cron externo: `Authorization: Bearer <YUYAY_CRON_SECRET>` (o CRON_SECRET, que es la
 *   variable que Vercel Cron envía automáticamente).
 * - Webhook de Vapi: cabecera `x-vapi-secret` igual a VAPI_WEBHOOK_SECRET
 *   (se configura como "Server URL Secret" en el asistente de Vapi).
 *
 * En producción, si el secreto no está configurado el endpoint queda cerrado (503).
 * En desarrollo, si no hay secreto configurado se deja pasar con una advertencia para
 * no romper las pruebas locales.
 */

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

const readBearer = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

const readHeader = (req: Request, name: string): string | null => {
  const value = req.headers[name.toLowerCase()];
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value.length > 0) return value[0].trim();
  return null;
};

const buildGuard =
  (label: string, getExpected: () => string | undefined, getProvided: (req: Request) => string | null) =>
  (req: Request, res: Response, next: NextFunction) => {
    const expected = getExpected();

    if (!expected) {
      if (isProduction()) {
        console.error(`[Yuyay Auth] ${label}: secreto no configurado en producción. Endpoint bloqueado.`);
        return res.status(503).json({ success: false, data: null, error: 'Servicio no configurado.' });
      }
      console.warn(`[Yuyay Auth] ${label}: secreto no configurado (permitido solo fuera de producción).`);
      return next();
    }

    const provided = getProvided(req);
    if (!provided || !safeEqual(provided, expected)) {
      return res.status(401).json({ success: false, data: null, error: 'No autorizado.' });
    }

    return next();
  };

export const requireYuyayAdmin = buildGuard(
  'Admin',
  () => process.env.YUYAY_ADMIN_TOKEN,
  readBearer
);

export const requireYuyayCron = buildGuard(
  'Cron',
  () => process.env.YUYAY_CRON_SECRET || process.env.CRON_SECRET,
  readBearer
);

export const requireVapiSignature = buildGuard(
  'Webhook Vapi',
  () => process.env.VAPI_WEBHOOK_SECRET,
  (req) => readHeader(req, 'x-vapi-secret')
);

/** Endpoints de prueba: no existen en producción. */
export const blockInProduction = (_req: Request, res: Response, next: NextFunction) => {
  if (isProduction()) {
    return res.status(404).json({ success: false, data: null, error: 'No encontrado.' });
  }
  return next();
};
