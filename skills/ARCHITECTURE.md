# Ayni Care — Arquitectura del Sistema

## Dominios del negocio

| Dominio | Descripción | Modelos involucrados |
|---------|-------------|----------------------|
| **AUTH** | Registro, login OTP, sesiones | User, FamilyMember |
| **FAMILY** | Grupo familiar, roles, invitaciones | Family, FamilyMember, Invitation |
| **ACTIVITIES** | Checklist de tareas de cuidado diarias | Activity, ActivityLog |
| **MEDICATIONS** | Registro de meds, horarios, recordatorios | Medication, MedLog |
| **APPOINTMENTS** | Calendario de citas médicas y otras | Appointment |
| **EXPENSES** | Gastos compartidos del cuidado | Expense, ExpenseSplit |
| **NOTES** | Notas médicas y de turno (handoff) | Note |
| **NOTIFICATIONS** | Push, email (Resend), en-app | (servicio transversal) |

## Roles de usuario en la familia

Para organizar el cuidado, cada miembro de la familia tiene un rol específico asociado a su nivel de involucramiento:

* **Cuidador Principal (`primary_caregiver`):** Es la persona que vive con el adulto mayor o asume la mayor carga de cuidado diario. Tiene acceso total para administrar el grupo, invitar miembros, gestionar gastos y modificar actividades o medicamentos.
* **Familiar Remoto (`remote_family`):** Familiar que apoya a la distancia. Puede ver todo, crear actividades, citas y gastos para coordinar desde lejos, pero no tiene acceso físico de cuidado (no administra medicamentos ni marca actividades como completadas) ni puede invitar/eliminar miembros.
* **Ayudante Ocasional (`weekend_helper`):** Familiar que ayuda de forma presencial esporádicamente (fines de semana, turnos cortos). Puede completar tareas diarias y administrar dosis de medicamentos, pero no tiene permisos para crear o eliminar configuraciones globales de medicamentos/actividades ni ver finanzas familiares.
* **Cuidador Pagado (`paid_caregiver`):** Enfermero o cuidador contratado externo. Solo tiene acceso a la información operativa del cuidado diario (ver actividades/medicamentos, completar tareas, registrar dosis y escribir notas de turno). Por privacidad y seguridad, tiene prohibido el acceso a gastos compartidos y administración familiar.

## Matriz de permisos RBAC

Referencia completa de qué puede hacer cada rol. La implementación técnica de este middleware se encuentra en [`skills/SECURITY.md`](file:///c:/Ayni%20Care/Ayni%20Care%20Github/skills/SECURITY.md).

### Actividades

| Acción | Cuidador Principal | Familiar Remoto | Ayudante Ocasional | Cuidador Pagado |
|--------|:-:|:-:|:-:|:-:|
| Ver actividades | ✅ | ✅ | ✅ | ✅ |
| Crear actividades | ✅ | ✅ | ✅ | ❌ |
| Completar actividades | ✅ | ❌ | ✅ | ✅ |
| Eliminar actividades | ✅ | ❌ | ❌ | ❌ |

### Medicamentos

| Acción | Cuidador Principal | Familiar Remoto | Ayudante Ocasional | Cuidador Pagado |
|--------|:-:|:-:|:-:|:-:|
| Ver medicamentos | ✅ | ✅ | ✅ | ✅ |
| Crear medicamentos | ✅ | ❌ | ❌ | ❌ |
| Administrar dosis | ✅ | ❌ | ✅ | ✅ |
| Eliminar medicamentos | ✅ | ❌ | ❌ | ❌ |

### Citas

| Acción | Cuidador Principal | Familiar Remoto | Ayudante Ocasional | Cuidador Pagado |
|--------|:-:|:-:|:-:|:-:|
| Ver citas | ✅ | ✅ | ✅ | ✅ |
| Crear citas | ✅ | ✅ | ✅ | ❌ |
| Eliminar citas | ✅ | ❌ | ❌ | ❌ |

### Gastos

| Acción | Cuidador Principal | Familiar Remoto | Ayudante Ocasional | Cuidador Pagado |
|--------|:-:|:-:|:-:|:-:|
| Ver gastos | ✅ | ✅ | ✅ | ❌ |
| Crear gastos | ✅ | ✅ | ✅ | ❌ |
| Eliminar gastos | ✅ | ❌ | ❌ | ❌ |

### Notas

| Acción | Cuidador Principal | Familiar Remoto | Ayudante Ocasional | Cuidador Pagado |
|--------|:-:|:-:|:-:|:-:|
| Ver notas | ✅ | ✅ | ✅ | ✅ |
| Crear notas | ✅ | ✅ | ✅ | ✅ |

### Familia y adulto mayor

| Acción | Cuidador Principal | Familiar Remoto | Ayudante Ocasional | Cuidador Pagado |
|--------|:-:|:-:|:-:|:-:|
| Invitar miembros | ✅ | ❌ | ❌ | ❌ |
| Eliminar miembros | ✅ | ❌ | ❌ | ❌ |
| Editar datos del adulto mayor | ✅ | ✅ | ❌ | ❌ |

## Flujo de datos principal

```
Usuario (mobile app)
  → React Query (fetch/mutate)
  → Express API (auth JWT + validación Zod)
  → Prisma (PostgreSQL en Supabase)
  → Supabase Realtime (broadcast a familia)
  → Resto de dispositivos del grupo familiar (actualización en tiempo real)
```

## Estructura de carpetas del proyecto

```
apps/
├── backend/
│   └── src/
│       ├── routes/          # Express routers (uno por dominio)
│       ├── controllers/     # Lógica de negocio
│       ├── middleware/      # auth, validate, errorHandler
│       ├── services/        # Lógica compleja (notificaciones, realtime, email)
│       ├── schemas/         # Zod schemas de validación
│       └── prisma/          # schema.prisma + cliente
└── mobile/
    └── src/
        ├── screens/         # Una carpeta por dominio (auth/, home/, meds/, etc.)
        ├── components/      # Componentes reutilizables
        ├── stores/          # Zustand stores
        ├── hooks/           # Custom hooks (useFamily, useMeds, etc.)
        ├── services/        # API calls (axios/fetch wrappers)
        └── navigation/      # Stack y Tab navigators

packages/
└── shared/
    └── src/
        └── types/           # Interfaces TypeScript compartidas entre apps
```

## Principios de diseño del MVP

1. **Simplicidad ante todo.** Mínimo de pasos para completar cualquier acción.
2. **Mobile first.** Diseñado para ser usado con una mano, en movimiento.
3. **Offline tolerance.** Si no hay internet, la app muestra la última data conocida (no colapsa).
4. **Accesibilidad.** Usuarios de 35-70 años, posiblemente poco tech-savvy. Texto grande, botones grandes.
5. **Español primero.** Todo el copy en español latinoamericano (Perú como referencia).

## Variables de entorno necesarias

```env
# Backend (apps/backend/.env)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
FROM_EMAIL=hola@aynicare.com
JWT_SECRET=...
PORT=3000
NODE_ENV=development

# Mobile (apps/mobile/.env)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
