/**
 * Inscripción de pacientes y plantillas de WhatsApp de Yuyay.
 * Sin base de datos ni servicios externos: Prisma, llamadas y WhatsApp se simulan.
 */
import request from 'supertest';

const tx = {
  family: { create: jest.fn() },
  familyMember: { create: jest.fn() },
  elderlyPerson: { create: jest.fn() },
  medication: { createMany: jest.fn() },
  scheduledCall: { createMany: jest.fn() },
  yuyayLead: { update: jest.fn() },
};

jest.mock('../src/prisma/client', () => ({
  prisma: {
    yuyayLead: { findUnique: jest.fn() },
    elderlyPerson: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../src/services/meta-whatsapp.service', () => {
  const actual = jest.requireActual('../src/services/meta-whatsapp.service');
  return {
    ...actual,
    sendMetaWhatsAppMessage: jest.fn(),
    sendMetaWhatsAppTemplate: jest.fn(),
  };
});

import { prisma } from '../src/prisma/client';
import * as meta from '../src/services/meta-whatsapp.service';
import * as callService from '../src/services/yuyay-call.service';
import { notifyAlert, notifyNightlyReport } from '../src/services/yuyay-notify.service';
import app from '../src/app';

const db = prisma as unknown as {
  yuyayLead: { findUnique: jest.Mock };
  elderlyPerson: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};
const ADMIN = { Authorization: 'Bearer admin-test' };
const env = { ...process.env };

beforeEach(() => {
  process.env.YUYAY_ADMIN_TOKEN = 'admin-test';
  db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
  tx.family.create.mockResolvedValue({ id: 'fam1' });
  tx.familyMember.create.mockResolvedValue({ id: 'mem1' });
  tx.elderlyPerson.create.mockResolvedValue({ id: 'eld1', name: 'Don Carlos' });
  db.elderlyPerson.findFirst.mockResolvedValue(null);
});

afterEach(() => {
  process.env = { ...env };
});

describe('POST /api/yuyay/enroll', () => {
  it('pide token de admin', async () => {
    const res = await request(app).post('/api/yuyay/enroll').send({});
    expect(res.status).toBe(401);
  });

  it('valida los datos de entrada', async () => {
    const res = await request(app)
      .post('/api/yuyay/enroll')
      .set(ADMIN)
      .send({ seniorName: 'Don Carlos', preferredCallTimes: ['8:30'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('preferredCallTimes');
  });

  it('inscribe desde un lead, sin consentimiento, y dispara la inducción', async () => {
    db.yuyayLead.findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'lead',
      childName: 'María',
      childPhone: '987654321',
      childEmail: null,
      seniorName: 'Don Carlos',
      seniorPhone: '939959366',
      seniorMeds: 'Losartán, Metformina',
      seniorConditions: 'Hipertensión',
      notes: null,
    });
    const dispatch = jest.spyOn(callService, 'dispatchOutboundCall').mockResolvedValue({
      success: true, callId: 'call-1', provider: 'simulation', isInduction: true, targetPhone: '', status: 'calling', message: '',
    });

    const res = await request(app)
      .post('/api/yuyay/enroll')
      .set(ADMIN)
      .send({ leadId: '11111111-1111-4111-8111-111111111111' });

    expect(res.status).toBe(201);
    expect(res.body.data.consentVerbal).toBe(false);
    expect(res.body.data.induction).toEqual({ started: true, callId: 'call-1' });

    expect(tx.elderlyPerson.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: '51939959366', consentVerbal: false, preferredCallTimes: ['08:30'] }),
    });
    expect(tx.familyMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: '51987654321', role: 'primary_caregiver' }),
    });
    expect(tx.medication.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ name: 'Losartán' }),
        expect.objectContaining({ name: 'Metformina' }),
      ],
    });
    expect(tx.yuyayLead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pilot_active' }) })
    );
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ elderlyId: 'eld1', isInduction: true }));
  });

  it('no inscribe dos veces el mismo celular', async () => {
    db.elderlyPerson.findFirst.mockResolvedValue({ id: 'ya-existe' });
    const res = await request(app)
      .post('/api/yuyay/enroll')
      .set(ADMIN)
      .send({ childName: 'María', childPhone: '987654321', seniorName: 'Don Carlos', seniorPhone: '939959366' });
    expect(res.status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('si la inducción falla, la inscripción se guarda igual y avisa el siguiente paso', async () => {
    jest.spyOn(callService, 'dispatchOutboundCall').mockRejectedValue(new Error('Vapi sin saldo'));
    const res = await request(app)
      .post('/api/yuyay/enroll')
      .set(ADMIN)
      .send({ childName: 'María', childPhone: '987654321', seniorName: 'Don Carlos', seniorPhone: '939959366' });
    expect(res.status).toBe(201);
    expect(res.body.data.induction).toEqual({ started: false, error: 'Vapi sin saldo' });
    expect(res.body.data.nextStep).toContain('trigger-call');
  });
});

describe('Plantillas de WhatsApp', () => {
  it('limpia parámetros que Meta rechazaría', () => {
    expect(meta.sanitizeTemplateParam('línea 1\nlínea 2')).toBe('línea 1 · línea 2');
    expect(meta.sanitizeTemplateParam('a     b')).toBe('a b');
    expect(meta.sanitizeTemplateParam('')).toBe('—');
  });

  it('con YUYAY_WA_USE_TEMPLATES=true envía la plantilla con sus parámetros', async () => {
    process.env.YUYAY_WA_USE_TEMPLATES = 'true';
    await notifyAlert({ to: '51987654321', childName: 'María', seniorName: 'Don Carlos', reason: 'Dolor de pecho' });
    expect(meta.sendMetaWhatsAppTemplate).toHaveBeenCalledWith({
      to: '51987654321',
      templateName: 'yuyay_alerta',
      languageCode: 'es',
      bodyParams: ['María', 'Don Carlos', 'Dolor de pecho', 'Sin detalle adicional'],
    });
    expect(meta.sendMetaWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('sin plantillas envía texto libre', async () => {
    process.env.YUYAY_WA_USE_TEMPLATES = 'false';
    await notifyNightlyReport({
      to: '51987654321',
      seniorName: 'Don Carlos',
      dateLabel: 'martes, 17 de noviembre',
      confirmedMeds: ['Losartán (08:31 a. m.)'],
      missedMeds: [],
      mood: 'Tranquilo',
      symptoms: 'Sin molestias',
      answeredCalls: 1,
      weeklyAdherence: 100,
    });
    expect(meta.sendMetaWhatsAppTemplate).not.toHaveBeenCalled();
    expect(meta.sendMetaWhatsAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '51987654321', text: expect.stringContaining('Losartán') })
    );
  });
});
