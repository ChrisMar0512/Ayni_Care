import request from 'supertest';
import app from '../src/app';

describe('Pruebas de Teleasistencia Yuyay (/api/yuyay)', () => {
  jest.setTimeout(40000);

  describe('POST /api/yuyay/register-lead', () => {
    it('debe rechazar solicitudes sin campos obligatorios con 400', async () => {
      const res = await request(app)
        .post('/api/yuyay/register-lead')
        .send({
          childName: 'Carlos Hijo',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('son campos obligatorios');
    });
  });

  describe('POST /api/yuyay/trigger-call', () => {
    it('debe requerir elderlyId con 400 si no se proporciona', async () => {
      const res = await request(app)
        .post('/api/yuyay/trigger-call')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('elderlyId');
    });
  });

  describe('GET /api/yuyay/cron', () => {
    it('debe responder 200 con el estado del scheduler y hora de Lima', async () => {
      const res = await request(app)
        .get('/api/yuyay/cron');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.currentTimeLima).toBeDefined();
    });
  });

  describe('POST /api/yuyay/test-scenario', () => {
    it('debe analizar exitosamente un escenario rutinario', async () => {
      const res = await request(app)
        .post('/api/yuyay/test-scenario')
        .send({
          scenario: 'routine_success',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario).toBe('routine_success');
      expect(res.body.analysis).toBeDefined();
    });

    it('debe procesar un escenario de consentimiento de inducción (Ley 29733)', async () => {
      const res = await request(app)
        .post('/api/yuyay/test-scenario')
        .send({
          scenario: 'induction',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario).toBe('induction');
      expect(res.body.analysis).toBeDefined();
    });

    it('debe procesar un escenario de bandera roja médica preventiva', async () => {
      const res = await request(app)
        .post('/api/yuyay/test-scenario')
        .send({
          scenario: 'red_flag_alert',
          childPhone: '51999888777',
          childName: 'María',
          seniorName: 'Don Carlos',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario).toBe('red_flag_alert');
      expect(res.body.analysis.hasRedFlag).toBe(true);
    });
  });
});
