import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import familyRoutes from './routes/family.routes';
import activitiesRoutes from './routes/activities.routes';
import medicationsRoutes from './routes/medications.routes';
import appointmentsRoutes from './routes/appointments.routes';
import expensesRoutes from './routes/expenses.routes';
import notesRoutes from './routes/notes.routes';
import notificationsRoutes from './routes/notifications.routes';
import jobsRoutes from './routes/jobs.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import assistantRoutes from './routes/assistant.routes';
import whatsappRoutes from './routes/meta-whatsapp.routes';
import telegramRoutes from './routes/telegram.routes';

const app = express();

// ── Trust Proxy for Vercel / Cloud proxies ────────────────────────────────────
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://aynicare.com', 'https://ayni-care.vercel.app', /\.vercel\.app$/]
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting (Safe for Serverless / Cloud Proxies) ─────────────────────────
const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: false,
  message: { success: false, data: null, error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: false,
  message: { success: false, data: null, error: 'Demasiados intentos. Espera 15 minutos.' },
});

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ── Body parsing (Permitir hasta 25MB para notas de voz en base64) ────────────
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// ── Health check & Diagnóstico ────────────────────────────────────────────────
app.get(['/', '/health', '/api', '/api/', '/api/health'], (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'Ayni Care API',
      time: new Date().toISOString(),
      env: {
        has_database: Boolean(process.env.DATABASE_URL),
        has_gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY),
        has_meta_token: Boolean(process.env.META_WA_VERIFY_TOKEN),
      },
    },
    error: undefined,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

export default app;
