import app from '../apps/backend/src/app';

export default function handler(req: any, res: any) {
  try {
    if (!req.socket) {
      req.socket = { remoteAddress: req.headers?.['x-forwarded-for'] || '127.0.0.1' };
    }

    // Si Vercel reescribió la ruta a /api, restaurar la ruta original si está presente
    const matchedPath = req.headers && req.headers['x-matched-path'];
    if (typeof matchedPath === 'string' && (req.url === '/api' || req.url === '/api/')) {
      req.url = matchedPath;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Unhandled Vercel serverless function error',
      message: err?.message,
      stack: err?.stack,
    });
  }
}
