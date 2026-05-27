# Ayni Care — Skill QA

## Stack de testing
- **Backend:** Jest + Supertest (tests de integración de endpoints)
- **Mobile:** Jest + React Native Testing Library
- **E2E:** Detox (solo para flujos críticos, no en MVP inicial)

## Casos críticos que SIEMPRE testear

### Auth y seguridad
- [ ] Usuario sin token no puede acceder a ningún endpoint protegido
- [ ] Usuario de familia A no puede ver/modificar datos de familia B
- [ ] Token expirado devuelve 401
- [ ] Invitación expirada no puede usarse

### Actividades (checklist)
- [ ] Crear actividad con y sin `scheduledAt`
- [ ] Completar actividad crea un `ActivityLog`
- [ ] No se puede completar una actividad ya completada
- [ ] Actividad asignada a miembro que abandona la familia → se desasigna, no falla

### Medicamentos
- [ ] Crear medicamento con horarios válidos e inválidos
- [ ] Registrar dosis crea `MedLog` correctamente
- [ ] Medicamento con `endDate` en el pasado no aparece como activo
- [ ] Stock negativo no es posible (validación Zod)

### Citas
- [ ] No se puede crear cita en el pasado (opcional: advertir, no bloquear)
- [ ] Recordatorio no se envía dos veces (flag `reminderSent`)
- [ ] Cancelar cita actualiza el status correctamente

### Gastos compartidos
- [ ] La suma de splits debe igualar el total del gasto
- [ ] Marcar split como pagado funciona correctamente
- [ ] Un miembro solo puede ver gastos de su familia

### Notas
- [ ] Crear nota requiere contenido no vacío
- [ ] Notas de tipo `handoff` aparecen primero en el feed

### Autorización (RBAC) — ver matriz completa en `skills/ARCHITECTURE.md`
- [ ] `paid_caregiver` NO puede ver gastos (403)
- [ ] `paid_caregiver` NO puede crear actividades (403)
- [ ] `paid_caregiver` NO puede crear medicamentos (403)
- [ ] `remote_family` NO puede completar actividades (403)
- [ ] `remote_family` NO puede administrar dosis (403)
- [ ] `weekend_helper` NO puede invitar miembros (403)
- [ ] `weekend_helper` NO puede eliminar miembros (403)
- [ ] Solo `primary_caregiver` puede eliminar actividades/medicamentos/gastos
- [ ] Solo `primary_caregiver` y `remote_family` pueden editar datos del adulto mayor

### Soft delete
- [ ] Eliminar actividad/medicamento/cita/gasto/nota usa `deletedAt` (no hard delete)
- [ ] Registros con `deletedAt` no aparecen en queries de lectura
- [ ] Los logs (ActivityLog, MedLog) nunca se borran

## Patrón de test para endpoints (backend)

```typescript
// activities.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma/client';
import { createTestFamily, createTestUser, getAuthToken } from './helpers';

describe('POST /api/activities', () => {
  let authToken: string;
  let familyId: string;

  beforeAll(async () => {
    const { family, member } = await createTestFamily();
    familyId = family.id;
    authToken = await getAuthToken(member.userId);
  });

  afterAll(async () => {
    await prisma.family.delete({ where: { id: familyId } });
  });

  it('crea una actividad correctamente', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Dar medicamento de la tarde', priority: 'urgent' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Dar medicamento de la tarde');
    expect(res.body.data.familyId).toBe(familyId);
  });

  it('falla sin autenticación', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ title: 'Test' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('falla con datos inválidos', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: '' }); // título vacío

    expect(res.status).toBe(400);
  });
});
```

## Patrón de test para componentes (mobile)

```tsx
// ActivityCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityCard } from '../src/components/activities/ActivityCard';

const mockActivity = {
  id: 'uuid-123',
  title: 'Dar medicamento',
  status: 'pending',
  priority: 'urgent',
  scheduledAt: new Date('2025-01-15T14:00:00Z'),
  assignedTo: { name: 'María' },
};

describe('ActivityCard', () => {
  it('muestra el título de la actividad', () => {
    const { getByText } = render(
      <ActivityCard activity={mockActivity} onComplete={jest.fn()} />
    );
    expect(getByText('Dar medicamento')).toBeTruthy();
  });

  it('llama onComplete al presionar', () => {
    const onComplete = jest.fn();
    const { getByText } = render(
      <ActivityCard activity={mockActivity} onComplete={onComplete} />
    );
    fireEvent.press(getByText('Completar'));
    expect(onComplete).toHaveBeenCalledWith('uuid-123');
  });
});
```

## Checklist de accesibilidad (revisar antes de cada PR)
- [ ] Todos los botones tienen mínimo 48px de alto
- [ ] Texto principal mínimo 16px
- [ ] Imágenes tienen `accessibilityLabel`
- [ ] Botones tienen `accessibilityLabel` descriptivo
- [ ] La app funciona con el tamaño de fuente aumentado (Accessibility settings del OS)
- [ ] Colores tienen contraste suficiente (WCAG AA mínimo)

## Patrón de test para autorización (RBAC)

```typescript
// authorization.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { createTestFamily, getAuthToken } from './helpers';

describe('Authorization — Expenses', () => {
  let primaryToken: string;
  let paidCaregiverToken: string;
  let familyId: string;

  beforeAll(async () => {
    const { family, members } = await createTestFamily({
      roles: ['primary_caregiver', 'paid_caregiver'],
    });
    familyId = family.id;
    primaryToken = await getAuthToken(members[0].userId);
    paidCaregiverToken = await getAuthToken(members[1].userId);
  });

  it('primary_caregiver puede ver gastos', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${primaryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('paid_caregiver NO puede ver gastos (403)', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${paidCaregiverToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('permisos');
  });
});
```

## Comandos de testing

```bash
# Backend
cd apps/backend
npm test                     # todos los tests
npm test -- --watch          # modo watch
npm test -- activities       # solo tests de actividades

# Mobile
cd apps/mobile
npm test                     # todos los tests
npm test -- --coverage       # con reporte de cobertura
```

## Criterio de "listo para merge"
Un feature está listo cuando:
1. Tests del endpoint/componente principal pasan
2. Casos de error (401, 400, 404) están cubiertos
3. El caso edge más probable del negocio está cubierto
4. No hay console.log olvidados
5. No hay `any` en TypeScript
6. Tests de autorización RBAC para los roles relevantes pasan
7. Operaciones de borrado usan soft delete (no hard delete)
