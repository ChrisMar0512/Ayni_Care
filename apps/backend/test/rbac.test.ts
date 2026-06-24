import request from 'supertest';
import app from '../src/app';
import { cleanupDatabase, createTestFamily, getAuthToken } from './helpers';
import { prisma } from '../src/prisma/client';

describe('Pruebas de Autorización Basada en Roles (RBAC)', () => {
  jest.setTimeout(30000);

  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Autenticación General', () => {
    it('debe retornar 401 si no se proporciona un token', async () => {
      const res = await request(app).get('/api/activities');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('debe retornar 401 si el token es inválido', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', 'Bearer token-invalido');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Control de Acceso de Actividades', () => {
    it('primary_caregiver: tiene acceso completo (crear, listar, completar)', async () => {
      // Crear familia con primary_caregiver
      const { members } = await createTestFamily({
        roles: ['primary_caregiver'],
      });
      const caregiver = members.find(m => m.role === 'primary_caregiver')!;
      const token = getAuthToken(caregiver.userId);

      // Crear actividad
      const createRes = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Actividad de Prueba',
          description: 'Hacer ejercicio',
          priority: 'normal',
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const activityId = createRes.body.data.id;

      // Listar actividades
      const listRes = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Completar actividad
      const completeRes = await request(app)
        .patch(`/api/activities/${activityId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Completado con éxito' });
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.success).toBe(true);
    });

    it('paid_caregiver: puede completar pero NO crear ni eliminar actividades', async () => {
      // Crear familia con primary_caregiver y paid_caregiver
      const { members, family } = await createTestFamily({
        roles: ['primary_caregiver', 'paid_caregiver'],
      });
      const caregiver = members.find(m => m.role === 'primary_caregiver')!;
      const paidCaregiver = members.find(m => m.role === 'paid_caregiver')!;
      
      const paidToken = getAuthToken(paidCaregiver.userId);

      // Crear actividad como administrador (directamente en la BD)
      const activity = await prisma.activity.create({
        data: {
          familyId: family.id,
          title: 'Medicina para la presión',
          status: 'pending',
        },
      });

      // paid_caregiver intenta crear actividad (debe dar 403)
      const createRes = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${paidToken}`)
        .send({
          title: 'Actividad por Cuidador',
          priority: 'normal',
        });
      expect(createRes.status).toBe(403);
      expect(createRes.body.success).toBe(false);

      // paid_caregiver intenta completar actividad (debe dar 200)
      const completeRes = await request(app)
        .patch(`/api/activities/${activity.id}/complete`)
        .set('Authorization', `Bearer ${paidToken}`)
        .send({ notes: 'Administrado' });
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.success).toBe(true);

      // paid_caregiver intenta borrar actividad (debe dar 403)
      const deleteRes = await request(app)
        .delete(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${paidToken}`);
      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.success).toBe(false);
    });

    it('remote_family: puede crear actividades pero NO completarlas', async () => {
      const { members } = await createTestFamily({
        roles: ['primary_caregiver', 'remote_family'],
      });
      const remote = members.find(m => m.role === 'remote_family')!;
      const remoteToken = getAuthToken(remote.userId);

      // remote_family intenta crear actividad (debe dar 201)
      const createRes = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${remoteToken}`)
        .send({
          title: 'Llamar al médico',
          priority: 'normal',
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const activityId = createRes.body.data.id;

      // remote_family intenta completar actividad (debe dar 403)
      const completeRes = await request(app)
        .patch(`/api/activities/${activityId}/complete`)
        .set('Authorization', `Bearer ${remoteToken}`)
        .send({ notes: 'Fui yo' });
      expect(completeRes.status).toBe(403);
      expect(completeRes.body.success).toBe(false);
    });
  });

  describe('Control de Acceso de Gastos', () => {
    it('primary_caregiver y remote_family pueden listar y crear gastos', async () => {
      const { members } = await createTestFamily({
        roles: ['primary_caregiver', 'remote_family'],
      });
      const caregiver = members.find(m => m.role === 'primary_caregiver')!;
      const remote = members.find(m => m.role === 'remote_family')!;
      const caregiverToken = getAuthToken(caregiver.userId);
      const remoteToken = getAuthToken(remote.userId);

      // primary_caregiver crea un gasto
      const expenseRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          title: 'Consulta Médica',
          amount: 150.00,
          currency: 'PEN',
          category: 'medical',
          date: new Date().toISOString(),
          splits: [
            { memberId: caregiver.id, amount: 75.00 },
            { memberId: remote.id, amount: 75.00 },
          ],
        });
      if (expenseRes.status !== 201) {
        console.log('[DEBUG] Gasto fallido:', expenseRes.body);
      }
      expect(expenseRes.status).toBe(201);
      expect(expenseRes.body.success).toBe(true);

      // remote_family lista gastos (debe dar 200)
      const listRes = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${remoteToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('paid_caregiver: NO puede ver ni crear gastos (403)', async () => {
      const { members } = await createTestFamily({
        roles: ['primary_caregiver', 'paid_caregiver'],
      });
      const paidCaregiver = members.find(m => m.role === 'paid_caregiver')!;
      const paidToken = getAuthToken(paidCaregiver.userId);

      // paid_caregiver intenta ver gastos (debe dar 403)
      const listRes = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${paidToken}`);
      expect(listRes.status).toBe(403);
      expect(listRes.body.success).toBe(false);

      // paid_caregiver intenta crear un gasto (debe dar 403)
      const createRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${paidToken}`)
        .send({
          title: 'Medicinas',
          amount: 50.00,
          currency: 'PEN',
          category: 'medications',
          date: new Date().toISOString(),
          splits: [],
        });
      expect(createRes.status).toBe(403);
      expect(createRes.body.success).toBe(false);
    });
  });
});
