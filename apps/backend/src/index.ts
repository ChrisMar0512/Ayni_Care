import 'dotenv/config';
import app from './app';
import { initYuyayBackgroundWorker } from './services/yuyay-scheduler.service';

const PORT = process.env.PORT ?? 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    // Iniciar scheduler autónomo de Yuyay (llamadas, reintentos y reporte nocturno a las 20:30)
    initYuyayBackgroundWorker();
  });
}

export default app;
