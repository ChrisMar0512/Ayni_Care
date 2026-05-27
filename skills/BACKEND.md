# Ayni Care — Skill Backend

## Stack exacto
- Node.js + Express 4.x + TypeScript
- Prisma 5.x (ORM) con PostgreSQL en Supabase
- Zod (validación de inputs)
- Supabase JS SDK (auth + realtime)
- Resend SDK (emails transaccionales)
- Jest + Supertest (tests)

## Estructura de carpetas (apps/backend/src/)

```
routes/
├── auth.routes.ts
├── family.routes.ts
├── activities.routes.ts
├── medications.routes.ts
├── appointments.routes.ts
├── expenses.routes.ts
└── notes.routes.ts

controllers/
├── auth.controller.ts
├── family.controller.ts
├── activities.controller.ts
├── medications.controller.ts
├── appointments.controller.ts
├── expenses.controller.ts
└── notes.controller.ts

middleware/
├── auth.middleware.ts      # Verifica JWT de Supabase
├── validate.middleware.ts  # Valida body/params con Zod schema
└── error.middleware.ts     # Manejo centralizado de errores

services/
├── realtime.service.ts     # Broadcast a grupo familiar
├── email.service.ts        # Resend wrapper
└── notification.service.ts # Push notifications (Expo)

schemas/                    # Zod schemas (uno por dominio)
├── activity.schema.ts
├── medication.schema.ts
└── ...

prisma/
├── schema.prisma
└── seed.ts
```

## Convenciones de código

### Rutas
```
GET    /api/activities          → listar actividades del adulto mayor
POST   /api/activities          → crear actividad
PATCH  /api/activities/:id      → actualizar actividad
DELETE /api/activities/:id      → eliminar actividad
PATCH  /api/activities/:id/complete → marcar como completada
```
- Siempre kebab-case: `/api/family-members`, `/api/med-logs`
- Siempre plural: `/api/activities`, `/api/medications`
- Acciones especiales con verbo al final: `/api/activities/:id/complete`

### Controladores — Patrón estándar
```typescript
export const createActivity = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.user; // del middleware de auth
    const data = req.validatedBody;  // del middleware de validación

    const activity = await prisma.activity.create({
      data: {
        ...data,
        familyId,
      },
    });

    // Notificar al grupo familiar en tiempo real
    await realtimeService.broadcast(familyId, 'activity:created', activity);

    res.json({ success: true, data: activity });
  } catch (error) {
    next(error); // siempre pasar a error middleware
  }
};
```

### Respuesta de error
```typescript
// error.middleware.ts emite:
res.status(statusCode).json({
  success: false,
  data: null,
  error: 'Mensaje descriptivo del error',
});
```

### Validación con Zod
```typescript
// schemas/activity.schema.ts
export const createActivitySchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  priority: z.enum(['urgent', 'normal', 'low']).default('normal'),
});

// En la ruta:
router.post('/', validate(createActivitySchema), createActivity);
```

### Auth middleware
```typescript
// Todo endpoint protegido tiene acceso a:
req.user = {
  id: string,           // userId de Supabase
  familyId: string,     // familia del usuario
  role: MemberRole,     // su rol en la familia
  memberId: string,     // ID del FamilyMember
}
```

### Authorization middleware (RBAC)
Después de autenticar, verificar permisos por rol. Ver implementación completa en `skills/SECURITY.md`.
```typescript
// Uso en rutas — siempre después de authenticate:
router.get('/', authenticate, requirePermission('activities:read'), listActivities);
router.post('/', authenticate, requirePermission('activities:create'), validate(createActivitySchema), createActivity);
router.patch('/:id/complete', authenticate, requirePermission('activities:complete'), completeActivity);
router.delete('/:id', authenticate, requirePermission('activities:delete'), deleteActivity);
```
Consultar la matriz de permisos en `skills/ARCHITECTURE.md` → sección "Matriz de permisos RBAC".

## Realtime — Cómo broadcast

```typescript
// services/realtime.service.ts
export const broadcast = async (familyId: string, event: string, payload: unknown) => {
  await supabase
    .channel(`family:${familyId}`)
    .send({ type: 'broadcast', event, payload });
};

// Eventos estándar (nombrar así en todo el proyecto):
// activity:created | activity:updated | activity:completed
// medication:created | medication:updated | med:logged
// appointment:created | appointment:updated
// expense:created | expense:updated
// note:created
```

## Email con Resend

```typescript
// services/email.service.ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendActivityReminder = async (to: string, activityTitle: string) => {
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to,
    subject: `Recordatorio: ${activityTitle}`,
    react: <ActivityReminderEmail title={activityTitle} />,
  });
};
```

## Reglas que NUNCA romper en backend
- Nunca confiar en datos del cliente sin validar con Zod primero
- Nunca exponer el `serviceRoleKey` de Supabase al cliente
- Nunca hacer queries sin filtrar por `familyId` del usuario autenticado
- Nunca devolver contraseñas, tokens, o datos sensibles en la respuesta
- Siempre usar transacciones Prisma para operaciones que escriben en múltiples tablas
