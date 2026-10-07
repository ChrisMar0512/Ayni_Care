import { Router, Request, Response, NextFunction } from 'express';
import { getAdminStats } from '../controllers/admin.controller';
import { adminDashboardHtml } from '../views/admin_dashboard';
import {
  getAnalyticsSummary,
  renderInsightsDashboard,
} from '../controllers/admin-analytics.controller';

const router = Router();

// Middleware to check admin token and render an access page on failure
const requireAdminToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.query.token || req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN || 'aynicare-admin-2026';

  if (!token || token !== expectedToken) {
    res.status(401).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <title>Ayni Care | Acceso Admin</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Outfit', 'sans-serif'],
                }
              }
            }
          }
        </script>
      </head>
      <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 antialiased">
        <div class="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 max-w-md w-full text-center space-y-6">
          <div class="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-md shadow-emerald-100">
            🔒
          </div>
          <div class="space-y-2">
            <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Acceso Restringido</h1>
            <p class="text-sm text-slate-400">Se requiere el token de administración para visualizar el dashboard de control de calidad e insights.</p>
          </div>
          
          <form method="GET" class="space-y-4">
            <div class="relative text-left">
              <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 pl-1">Token de Administrador</label>
              <input type="password" name="token" placeholder="Ingresa el token de prueba..." required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all duration-200">
            </div>
            <button type="submit" class="w-full bg-emerald-700 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-emerald-800 active:scale-[0.98] transition-all duration-200 shadow-md shadow-emerald-700/10">
              Ingresar al Dashboard
            </button>
          </form>
          
          ${token ? '<p class="text-xs font-medium text-rose-500 animate-pulse">⚠️ Token incorrecto. Inténtalo de nuevo.</p>' : ''}
        </div>
      </body>
      </html>
    `);
    return;
  }
  next();
};

// Middleware to check admin token and return JSON on failure (for API requests)
const requireAdminTokenJson = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.query.token || req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN || 'aynicare-admin-2026';

  if (!token || token !== expectedToken) {
    res.status(401).json({
      success: false,
      data: null,
      error: 'Token de administrador inválido o no proporcionado'
    });
    return;
  }
  next();
};

// ── Rutas de Dashboard y Analítica ──────────────────────────────────────────
router.get('/', requireAdminToken, (req: Request, res: Response) => {
  res.send(adminDashboardHtml);
});

// Dashboard visual de Discovery e Inteligencia de Negocio
router.get('/insights', requireAdminToken, renderInsightsDashboard);

// API JSON con resumen analítico
router.get('/analytics/summary', requireAdminTokenJson, getAnalyticsSummary);
router.get('/api/admin/stats', requireAdminTokenJson, getAdminStats);

export default router;
