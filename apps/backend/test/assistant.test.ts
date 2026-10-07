import request from 'supertest';
import app from '../src/app';
import { cleanupDatabase, createTestFamily, getAuthToken } from './helpers';
import { prisma } from '../src/prisma/client';

describe('Pruebas del Asistente de IA (/api/assistant)', () => {
  jest.setTimeout(30000);

  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  it('debe retornar 401 si no se envía token de autenticación', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({ message: 'Hola' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('debe validar que se envíe al menos un mensaje o audio (400 Bad Request)', async () => {
    const { members } = await createTestFamily({
      roles: ['primary_caregiver'],
    });
    const caregiver = members.find((m) => m.role === 'primary_caregiver')!;
    const token = getAuthToken(caregiver.userId);

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
