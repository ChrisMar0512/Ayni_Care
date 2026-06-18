import { Router } from 'express';
import { runRemindersJob } from '../controllers/jobs.controller';

const router = Router();

// Endpoint del Cron Job de Vercel (llamado mediante GET)
router.get('/reminders', runRemindersJob);

export default router;
