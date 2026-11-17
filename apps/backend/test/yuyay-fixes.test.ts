/**
 * Pruebas de las correcciones de producción de Yuyay (rama fix/yuyay-produccion).
 * No requieren base de datos ni claves externas: Prisma y el servicio de llamadas se simulan.
 */
import request from 'supertest';

jest.mock('../src/prisma/client', () => ({
  prisma: {
    scheduledCall: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    callLog: { create: jest.fn(), findFirst: jest.fn() },
  },
}));

import { prisma } from '../src/prisma/client';
import { getLimaClock, getLimaStartOfDay, parseHHmm, getTimeSlotForHHmm } from '../src/services/yuyay-time';
import * as callService from '../src/services/yuyay-call.service';
import { processDueScheduledCalls, processRetriesAndMissedCalls } from '../src/services/yuyay-scheduler.service';
import app from '../src/app';

type MockFn = jest.Mock;
const db = prisma as unknown as {
  scheduledCall: { findMany: MockFn; updateMany: MockFn; update: MockFn };
  callLog: { create: MockFn; findFirst: MockFn };
};

// 17 nov 2026, 13:10 UTC = 08:10 en Lima
const NOW = new Date('2026-11-17T13:10:00Z');
const YESTERDAY = new Date('2026-11-16T13:00:00Z');

describe('Hora de Lima', () => {
  it('convierte UTC a hora de Lima', () => {
    const clock = getLimaClock(NOW);
    expect(clock.timeStr).toBe('08:10');
    expect(clock.dateStr).toBe('2026-11-17');
    expect(clock.minutesOfDay).toBe(8 * 60 + 10);
  });

  it('el día de Lima empieza a las 05:00 UTC', () => {
    expect(getLimaStartOfDay(NOW).toISOString()).toBe('2026-11-17T05:00:00.000Z');
    // 01:30 UTC del 18 = 20:30 del 17 en Lima: sigue siendo "hoy" 17
    expect(getLimaStartOfDay(new Date('2026-11-18T01:30:00Z')).toISOString()).toBe('2026-11-17T05:00:00.000Z');
  });

  it('valida horas HH:mm', () => {
    expect(parseHHmm('08:30')).toBe(510);
    expect(parseHHmm('8:30')).toBeNull();
    expect(parseHHmm('25:00')).toBeNull();
    expect(getTimeSlotForHHmm('20:00')).toBe('noche');
  });
});

describe('Utilidades de llamada', () => {
  it('traduce endedReason de Vapi', () => {
    expect(callService.mapVapiEndedReason('customer-did-not-answer')).toBe('no_answer');
    expect(callService.mapVapiEndedReason('customer-busy')).toBe('busy');
    expect(callService.mapVapiEndedReason('voicemail')).toBe('machine');
    expect(callService.mapVapiEndedReason('twilio-failed-to-connect-call')).toBe('failed');
    expect(callService.mapVapiEndedReason('customer-ended-call')).toBeNull();
    expect(callService.mapVapiEndedReason(undefined)).toBeNull();
  });

  it('normaliza celulares peruanos a formato internacional', () => {
    expect(callService.normalizePeruPhone('939 959 366')).toBe('51939959366');
    expect(callService.normalizePeruPhone('+51 939959366')).toBe('51939959366');
  });
});

describe('Scheduler: llamadas del día', () => {
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    dispatchSpy = jest.spyOn(callService, 'dispatchOutboundCall').mockResolvedValue({
      success: true,
      callId: 'x',
      provider: 'simulation',
      isInduction: false,
      targetPhone: '51900000000',
      status: 'calling',
      message: '',
    });
    db.scheduledCall.updateMany.mockResolvedValue({ count: 1 });
  });

  const call = (overrides: Record<string, unknown>) => ({
    id: 'c1',
    elderlyId: 'e1',
    scheduledTime: '08:00',
    timeSlot: 'mañana',
    status: 'completed',
    retryCount: 0,
    lastCallAt: YESTERDAY,
    elderly: { phone: '939959366', consentVerbal: true },
    ...overrides,
  });

  it('vuelve a llamar hoy una llamada que ayer quedó completada', async () => {
    db.scheduledCall.findMany.mockResolvedValue([call({})]);
    const count = await processDueScheduledCalls(NOW);
    expect(count).toBe(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ scheduledCallId: 'c1' }));
  });

  it('solo busca adultos mayores con consentimiento', async () => {
    db.scheduledCall.findMany.mockResolvedValue([]);
    await processDueScheduledCalls(NOW);
    expect(db.scheduledCall.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ elderly: expect.objectContaining({ consentVerbal: true }) }),
      })
    );
  });

  it('no llama antes de la hora ni más de 60 min tarde', async () => {
    db.scheduledCall.findMany.mockResolvedValue([
      call({ id: 'futuro', scheduledTime: '09:00' }),
      call({ id: 'muy-tarde', scheduledTime: '07:00' }),
    ]);
    expect(await processDueScheduledCalls(NOW)).toBe(0);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('no duplica si otro proceso ya reclamó la llamada', async () => {
    db.scheduledCall.findMany.mockResolvedValue([call({})]);
    db.scheduledCall.updateMany.mockResolvedValue({ count: 0 });
    expect(await processDueScheduledCalls(NOW)).toBe(0);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('si el proveedor falla, marca la llamada como fallida sin alertar a la familia', async () => {
    db.scheduledCall.findMany.mockResolvedValue([call({})]);
    dispatchSpy.mockRejectedValue(new Error('Vapi caído'));
    const alertSpy = jest.spyOn(callService, 'triggerImmediateRedFlagAlert');
    expect(await processDueScheduledCalls(NOW)).toBe(0);
    expect(db.scheduledCall.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'failed' } });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('Scheduler: reintentos', () => {
  it('trata como no contestada una llamada colgada en "calling" y reintenta a los 15 min', async () => {
    const missedSpy = jest.spyOn(callService, 'handleMissedCallAttempt').mockResolvedValue();
    const dispatchSpy = jest.spyOn(callService, 'dispatchOutboundCall').mockResolvedValue({
      success: true, callId: 'x', provider: 'simulation', isInduction: false, targetPhone: '', status: 'calling', message: '',
    });
    db.scheduledCall.updateMany.mockResolvedValue({ count: 1 });
    db.scheduledCall.findMany
      .mockResolvedValueOnce([{ id: 'colgada' }])
      .mockResolvedValueOnce([
        { id: 'r1', elderlyId: 'e1', timeSlot: 'mañana', retryCount: 1, lastCallAt: new Date(NOW.getTime() - 16 * 60000) },
        { id: 'r2', elderlyId: 'e1', timeSlot: 'mañana', retryCount: 1, lastCallAt: new Date(NOW.getTime() - 5 * 60000) },
      ]);

    const retries = await processRetriesAndMissedCalls(NOW);

    expect(missedSpy).toHaveBeenCalledWith('colgada');
    expect(retries).toBe(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ scheduledCallId: 'r1' }));
  });
});

describe('Seguridad de /api/yuyay', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('exige token de admin para disparar llamadas', async () => {
    process.env.YUYAY_ADMIN_TOKEN = 'token-de-prueba';
    const sinToken = await request(app).post('/api/yuyay/trigger-call').send({});
    expect(sinToken.status).toBe(401);

    const conToken = await request(app)
      .post('/api/yuyay/trigger-call')
      .set('Authorization', 'Bearer token-de-prueba')
      .send({});
    expect(conToken.status).toBe(400); // pasa la autenticación y falla por falta de elderlyId
  });

  it('rechaza webhooks sin la firma de Vapi', async () => {
    process.env.VAPI_WEBHOOK_SECRET = 'secreto-vapi';
    const res = await request(app).post('/api/yuyay/voice-webhook').send({ transcript: 'hola' });
    expect(res.status).toBe(401);
  });

  it('exige secreto para el cron', async () => {
    process.env.YUYAY_CRON_SECRET = 'secreto-cron';
    const res = await request(app).get('/api/yuyay/cron');
    expect(res.status).toBe(401);
  });

  it('en producción los endpoints de prueba no existen y sin secretos todo queda cerrado', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.YUYAY_ADMIN_TOKEN;
    delete process.env.VAPI_WEBHOOK_SECRET;

    expect((await request(app).post('/api/yuyay/setup-test-patient').send({})).status).toBe(404);
    expect((await request(app).post('/api/yuyay/test-scenario').send({})).status).toBe(404);
    expect((await request(app).post('/api/yuyay/trigger-call').send({})).status).toBe(503);
    expect((await request(app).post('/api/yuyay/voice-webhook').send({})).status).toBe(503);
  });
});
