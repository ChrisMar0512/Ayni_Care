# Ayni Care — Skill Seguridad

## Autenticación

### Flujo de auth
```
1. Usuario ingresa teléfono o email
2. Supabase Auth envía OTP (6 dígitos)
3. Usuario ingresa OTP → Supabase devuelve JWT
4. Mobile guarda JWT en Expo SecureStore (NUNCA AsyncStorage)
5. Cada request al backend incluye: Authorization: Bearer <jwt>
6. Backend verifica JWT con Supabase Admin SDK
```

### JWT — Qué contiene
```typescript
// El JWT de Supabase incluye:
{
  sub: string,       // userId de Supabase Auth
  email?: string,
  phone?: string,
  exp: number,       // expiración (timestamp)
  aud: string,       // audience
}
```

### Refresh de tokens
- Supabase maneja el refresh automáticamente con `supabase.auth.onAuthStateChange`
- En mobile: configurar el listener en `AppNavigator.tsx` al montar la app
- Si el token expira y no hay refresh → redirigir a LoginScreen

---

## Autorización — RBAC (Role-Based Access Control)

### Middleware de autorización
```typescript
// middleware/authorize.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { MemberRole } from '@prisma/client';

type Permission = 
  | 'activities:read' | 'activities:create' | 'activities:complete' | 'activities:delete'
  | 'medications:read' | 'medications:create' | 'medications:administer' | 'medications:delete'
  | 'appointments:read' | 'appointments:create' | 'appointments:delete'
  | 'expenses:read' | 'expenses:create' | 'expenses:delete'
  | 'notes:read' | 'notes:create'
  | 'family:invite' | 'family:remove' | 'family:edit_elderly';

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  primary_caregiver: [
    'activities:read', 'activities:create', 'activities:complete', 'activities:delete',
    'medications:read', 'medications:create', 'medications:administer', 'medications:delete',
    'appointments:read', 'appointments:create', 'appointments:delete',
    'expenses:read', 'expenses:create', 'expenses:delete',
    'notes:read', 'notes:create',
    'family:invite', 'family:remove', 'family:edit_elderly',
  ],
  remote_family: [
    'activities:read', 'activities:create',
    'medications:read',
    'appointments:read', 'appointments:create',
    'expenses:read', 'expenses:create',
    'notes:read', 'notes:create',
    'family:edit_elderly',
  ],
  weekend_helper: [
    'activities:read', 'activities:create', 'activities:complete',
    'medications:read', 'medications:administer',
    'appointments:read', 'appointments:create',
    'expenses:read', 'expenses:create',
    'notes:read', 'notes:create',
  ],
  paid_caregiver: [
    'activities:read', 'activities:complete',
    'medications:read', 'medications:administer',
    'appointments:read',
    'notes:read', 'notes:create',
  ],
};

export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.user;
    const userPermissions = ROLE_PERMISSIONS[role];

    const hasAll = permissions.every(p => userPermissions.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'No tienes permisos para realizar esta acción',
      });
    }

    next();
  };
};
```

### Uso en rutas
```typescript
// routes/medications.routes.ts
router.get('/', authenticate, requirePermission('medications:read'), listMedications);
router.post('/', authenticate, requirePermission('medications:create'), validate(createMedSchema), createMedication);
router.patch('/:id/administer', authenticate, requirePermission('medications:administer'), administerMedication);
router.delete('/:id', authenticate, requirePermission('medications:delete'), deleteMedication);
```

### Matriz de permisos completa

Ver [ARCHITECTURE.md](file:///c:/Ayni%20Care/Ayni%20Care%20Github/skills/ARCHITECTURE.md) → sección "Matriz de permisos RBAC" para la tabla visual completa.

---

## Row Level Security (RLS) en Supabase

### Decisión para el MVP
**NO usamos RLS de Supabase directamente.** La autorización se maneja en el backend con middleware.

**Razón:** El backend usa Prisma con la `SERVICE_ROLE_KEY` de Supabase (que bypasea RLS). Implementar RLS además del middleware sería redundante y complicaría el debug.

**Para el futuro (post-MVP):** Si algún día se necesita acceso directo desde el cliente a Supabase (por ejemplo, para Realtime subscriptions con filtros), se habilitará RLS como segunda capa.

### Regla actual
```
Toda query de Prisma DEBE filtrar por familyId del usuario autenticado.
El middleware de auth inyecta familyId en req.user.
Nunca confiar en un familyId que venga del body del request.
```

---

## Rate Limiting

### Configuración para Express
```typescript
// middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

// Rate limit general (todas las rutas)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                  // máximo 100 requests por IP
  message: {
    success: false,
    data: null,
    error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
  },
});

// Rate limit para auth (más estricto)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                   // máximo 10 intentos de login
  message: {
    success: false,
    data: null,
    error: 'Demasiados intentos. Espera 15 minutos.',
  },
});

// Uso en app.ts:
// app.use('/api/', generalLimiter);
// app.use('/api/auth/', authLimiter);
```

---

## CORS

### Configuración
```typescript
// app.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://aynicare.com']  // solo el dominio de producción
    : '*',                       // en dev, permitir todo
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Nota:** Para la app móvil, CORS técnicamente no aplica (es nativo, no browser). Pero es buena práctica configurarlo para:
- Futuras herramientas admin web
- Testing desde Postman/browser
- Seguridad general del servidor

---

## Sanitización de inputs

### Qué hace Zod (ya incluido)
- Valida tipos de datos (string, number, uuid, etc.)
- Rechaza campos inesperados con `.strict()` o `.strip()`
- Limita longitud de strings con `.max()`

### Qué NO hace Zod (agregar manualmente si se necesita)
- **XSS en campos de texto libre**: Si se muestra HTML en algún lado (web admin futuro), sanitizar con `DOMPurify` o similar. En React Native esto no es un problema porque `<Text>` no renderiza HTML.
- **SQL Injection**: Prisma usa queries parametrizadas → protegido por defecto. **NUNCA usar `$queryRawUnsafe` con inputs del usuario.**

### Regla
```
Para el MVP móvil: Zod + Prisma es suficiente.
Si se agrega un panel web admin: agregar sanitización XSS.
```

---

## Checklist de seguridad pre-deploy

- [ ] `SUPABASE_SERVICE_ROLE_KEY` NO está en el código del cliente (solo en backend env)
- [ ] `JWT_SECRET` tiene mínimo 32 caracteres
- [ ] Rate limiting está activo en producción
- [ ] CORS está configurado solo para dominios permitidos
- [ ] Todas las rutas protegidas usan `authenticate` middleware
- [ ] Todas las rutas con escritura usan `requirePermission()` con el permiso correcto
- [ ] No hay `console.log` que imprima tokens, passwords o datos sensibles
- [ ] Variables de entorno están en el provider (Railway/Render), NO en el código
- [ ] `NODE_ENV=production` está seteado en el servidor de producción
- [ ] Las migraciones de Prisma están aplicadas (`prisma migrate deploy`)
