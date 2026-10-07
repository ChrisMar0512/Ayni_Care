let appInstance: any = null;
let bootError: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const appModule = require('../apps/backend/src/app');
  appInstance = appModule.default || appModule;
} catch (err: any) {
  console.error('[Vercel Boot Error]', err);
  bootError = {
    message: err?.message || String(err),
    name: err?.name,
    stack: err?.stack,
  };
}

export default function handler(req: any, res: any) {
  if (bootError || !appInstance) {
    return res.status(500).json({
      success: false,
      error: 'Vercel Serverless Boot Failure',
      details: bootError,
      env_check: {
        NODE_ENV: process.env.NODE_ENV,
        has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
        has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        has_JWT_SECRET: Boolean(process.env.JWT_SECRET),
        has_ADMIN_TOKEN: Boolean(process.env.ADMIN_TOKEN),
      },
    });
  }

  if (!req.socket) {
    req.socket = { remoteAddress: req.headers?.['x-forwarded-for'] || '127.0.0.1' };
  }

  // Si Vercel reescribió la ruta a /api, restaurar la ruta original si está presente
  const matchedPath = req.headers && req.headers['x-matched-path'];
  if (typeof matchedPath === 'string' && (req.url === '/api' || req.url === '/api/')) {
    req.url = matchedPath;
  }

  return appInstance(req, res);
}
