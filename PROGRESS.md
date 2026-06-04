# Ayni Care — Estado del Proyecto
> Auditoría QA · 2026-06-03

---

## ✅ Lo que está bien

### Infraestructura del monorepo
- Estructura de workspaces (`apps/mobile`, `apps/backend`, `packages/shared`) correcta según CLAUDE.md
- `package.json` raíz con npm workspaces configurado
- `.gitignore` presente y cubre `node_modules/`, `.env`, `.expo/`, `dist/`
- `apps/backend/.env.example` y `apps/mobile/.env.example` presentes con todas las variables necesarias
- Convenciones de git (tipo/dominio en español) documentadas y en uso

### Base de datos — `prisma/schema.prisma`
- **Todos los modelos del MVP están definidos:** `Family`, `FamilyMember`, `ElderlyPerson`, `Activity`, `ActivityLog`, `Medication`, `MedLog`, `Appointment`, `Expense`, `ExpenseSplit`, `Note`, `Invitation`
- **Soft delete implementado** en todos los modelos que lo requieren: `Activity.deletedAt`, `Medication.deletedAt`, `Appointment.deletedAt`, `Expense.deletedAt`, `Note.deletedAt`
- **IDs UUID** en todos los modelos (`@id @default(uuid())`) — sin IDs numéricos expuestos
- **`familyId` presente** en todos los modelos de negocio — permite filtrar por familia en cada query
- **Logs inmutables:** `ActivityLog` y `MedLog` no tienen `deletedAt` (correcto: no se borran)
- **`MemberRole` enum** con los 4 roles exactos del RBAC: `primary_caregiver`, `remote_family`, `weekend_helper`, `paid_caregiver`
- **Invitaciones** tienen `expiresAt` y `usedAt` (soporta invalidar invitaciones expiradas)
- **`Appointment.reminderSent`** presente (evita enviar recordatorios dos veces)
- **`Expense.amount` y `ExpenseSplit.amount`** usan `Decimal @db.Decimal(10,2)` (correcto para dinero)
- **`datasource` con `directUrl`** para migraciones directas en Supabase (correcto)

### Backend — `src/index.ts`
- Express con `dotenv/config`, `cors()`, y `express.json()` configurados
- Endpoint `/health` con formato correcto: `{ success: true, data: { status: 'ok' }, error: undefined }`
- Exporta `app` (necesario para tests con Supertest)

### Mobile — Expo SDK 54
- Actualización completada: expo `~54.0.0`, React `19.1.0`, React Native `0.81.5`
- Entry point `index.js` con `registerRootComponent` correcto para monorepo
- `metro.config.js` con `getDefaultConfig(__dirname)` — Expo detecta el monorepo automáticamente
- `babel.config.js` con `babel-preset-expo` (devDependency explícita)
- `tsconfig.json` mobile extiende `expo/tsconfig.base` directamente (`moduleResolution: "bundler"`)
- `tsconfig.json` raíz y backend sin conflictos de TypeScript
- `package.json` raíz fija `react@19.1.0` y `react-native@0.81.5` como deps directas (resuelve el conflicto de versiones con nativewind)
- `npm run dev:mobile` usa `expo start apps/mobile` (funciona desde cualquier CWD)

### `packages/shared`
- `ApiResponse<T>` definido con el formato correcto: `{ success, data, error? }`
- `MemberRole` type exportado y disponible para backend y mobile

---

## ❌ Lo que falta / No cumple los estándares

### Backend — Crítico (bloquea MVP)

| # | Problema | Archivo | Impacto |
|---|----------|---------|---------|
| 1 | **No existe ninguna ruta ni controlador** | `src/routes/`, `src/controllers/` | Sin API, la app no puede funcionar |
| 2 | **No existe `authenticate` middleware** | `src/middleware/auth.middleware.ts` | Sin auth, cualquiera puede hacer queries |
| 3 | **No existe `requirePermission` middleware** | `src/middleware/authorize.middleware.ts` | Sin RBAC, todos los roles ven todo |
| 4 | **No existe `validate` middleware** | `src/middleware/validate.middleware.ts` | Sin validación Zod, datos inválidos llegan a la BD |
| 5 | **No existe cliente Prisma** | `src/prisma/client.ts` o similar | Ningún controlador puede hacer queries |
| 6 | **CORS sin restricción en producción** | `src/index.ts:8` | `cors()` sin opciones = acepta cualquier origen. Debe ser configurado como en `skills/SECURITY.md` |
| 7 | **Sin rate limiting** | `src/index.ts` | Endpoint `/auth` vulnerable a fuerza bruta |
| 8 | **Sin schemas Zod** | `src/schemas/` | La validación de inputs no existe todavía |

### Backend — No crítico (MVP funcional pero incompleto)

| # | Problema | Detalle |
|---|----------|---------|
| 9 | **Sin `error.middleware.ts`** | Los errores no se capturan globalmente; cada `try/catch` necesita manejar su propio formato |
| 10 | **Sin `realtime.service.ts`** | Las escrituras no emiten eventos. Viola la regla "toda escritura emite evento realtime" |
| 11 | **Sin `email.service.ts`** | Sin recordatorios de citas, sin notificaciones de invitaciones |
| 12 | **Sin `prisma/seed.ts`** | Sin datos de prueba, difícil de desarrollar localmente |
| 13 | **`Expense` sin `updatedAt`** | El resto de modelos tiene `updatedAt`. Inconsistencia. |
| 14 | **Sin tests** | Ningún test de integración existe. Ver `skills/QA.md` para el patrón. |

### Mobile — No crítico (Expo SDK 54 funciona, pero UI sin implementar)

| # | Problema | Detalle |
|---|----------|---------|
| 15 | **`assets/` no existe** | `app.json` referencia `./assets/icon.png`, `splash.png`, `adaptive-icon.png` — expo-doctor reporta error |
| 16 | **NativeWind deshabilitado** | `withNativeWind` comentado en `metro.config.js` por incompatibilidad con nativewind@4.2.4 + RN 0.81.5. Ninguna pantalla puede usar `className`. |
| 17 | **`global.css` y `tailwind.config.js` presentes pero sin efecto** | Sin `withNativeWind`, los archivos de NativeWind no tienen función. Pueden confundir. |
| 18 | **`App.tsx` es placeholder** | Solo muestra "Ayni Care" con `StyleSheet`. Sin navegación, auth, ni pantallas. |
| 19 | **`src/` completamente vacío** | Carpetas `.gitkeep`: `screens/`, `components/`, `hooks/`, `stores/`, `navigation/`, `services/` — nada implementado |
| 20 | **Sin `ErrorBoundary`** | `skills/MOBILE.md` requiere envolver la app en `<ErrorBoundary>` |
| 21 | **Sin tests de mobile** | Zero tests en React Native Testing Library |

### Configuración — Menor

| # | Problema | Detalle |
|---|----------|---------|
| 22 | **`nativewind-env.d.ts` incluida en tsconfig** | Genera tipos de NativeWind pero NativeWind está deshabilitado |
| 23 | **`mobile/package.json` devDeps desordenadas** | `babel-preset-expo` insertado en medio, no al final del bloque devDependencies |

---

## 🗺️ Próximos pasos por feature (orden de prioridad MVP)

### Feature 1 — Auth + Familia (PRIORIDAD MÁXIMA)
> Bloqueante para todo lo demás. Sin auth no hay app.

**Backend:**
- [ ] Crear `src/prisma/client.ts` (instancia singleton de PrismaClient)
- [ ] Crear `src/middleware/auth.middleware.ts` — verificar JWT con Supabase Admin SDK, inyectar `req.user`
- [ ] Crear `src/middleware/authorize.middleware.ts` — `requirePermission()` según `skills/SECURITY.md`
- [ ] Crear `src/middleware/validate.middleware.ts` — wrapper de Zod
- [ ] Crear `src/middleware/error.middleware.ts` — manejador global de errores
- [ ] Configurar CORS restrictivo en `src/index.ts`
- [ ] Agregar rate limiting (`express-rate-limit`) — 100 req/15min general, 10 req/15min en `/auth`
- [ ] Crear `src/routes/auth.routes.ts` + `src/controllers/auth.controller.ts`
  - `POST /api/auth/verify-otp` — intercambiar OTP por sesión
  - `POST /api/auth/logout`
- [ ] Crear `src/routes/family.routes.ts` + `src/controllers/family.controller.ts`
  - `POST /api/family` — crear familia
  - `POST /api/family/invite` — enviar invitación (email/SMS)
  - `POST /api/family/join` — aceptar invitación con token
  - `GET /api/family/members` — listar miembros
  - `DELETE /api/family/members/:id` — eliminar miembro
- [ ] Tests de autorización: token sin bearer → 401, token de familia B → 403

**Mobile:**
- [ ] Resolver NativeWind: hacer downgrade de nativewind a la última versión `4.1.x` (usa reanimated@3.x compatible con RN 0.81.5) o instalar `react-native-reanimated@3.x` explícitamente en mobile para bloquear la resolución de 4.x
- [ ] Crear `apps/mobile/assets/` con `icon.png`, `splash.png`, `adaptive-icon.png` (placeholders válidos de Expo)
- [ ] Crear `src/services/api.ts` — cliente axios con interceptores según `skills/MOBILE.md`
- [ ] Crear `src/stores/authStore.ts` — Zustand store con `user`, `familyId`, `role`
- [ ] Crear `src/navigation/AppNavigator.tsx` — envuelto en `<ErrorBoundary>`, switch auth/app
- [ ] Crear `src/screens/auth/LoginScreen.tsx` — campo teléfono/email + botón enviar OTP
- [ ] Crear `src/screens/auth/OTPScreen.tsx` — campo de 6 dígitos + verificar

---

### Feature 2 — Checklist de Actividades
**Backend:**
- [ ] `src/schemas/activity.schema.ts` — Zod schema de crear/actualizar
- [ ] `src/routes/activities.routes.ts` + `src/controllers/activities.controller.ts`
  - `GET /api/activities` — filtrar por `familyId` + `deletedAt IS NULL`
  - `POST /api/activities` — crear, broadcast `activity:created`
  - `PATCH /api/activities/:id` — actualizar, broadcast `activity:updated`
  - `PATCH /api/activities/:id/complete` — crea `ActivityLog`, broadcast `activity:completed`
  - `DELETE /api/activities/:id` — soft delete (`deletedAt = now()`)
- [ ] Tests: crear, completar, doble-completar (400), sin auth (401), rol sin permiso (403)

**Mobile:**
- [ ] `src/hooks/useActivities.ts` — React Query hooks
- [ ] `src/screens/activities/ActivitiesScreen.tsx` — lista con 3 estados
- [ ] `src/components/activities/ActivityCard.tsx` — con `Pressable` ≥ 48px

---

### Feature 3 — Medicamentos
**Backend:**
- [ ] `src/schemas/medication.schema.ts`
- [ ] Rutas CRUD + `PATCH /api/medications/:id/administer` (crea `MedLog`)
- [ ] Test: stock negativo bloqueado por Zod, `paid_caregiver` no puede crear (403)

**Mobile:**
- [ ] `src/hooks/useMedications.ts`
- [ ] `src/screens/medications/MedicationsScreen.tsx`
- [ ] `src/screens/medications/AddMedicationScreen.tsx`

---

### Feature 4 — Citas
**Backend:**
- [ ] Rutas CRUD de `Appointment`
- [ ] Job de recordatorio (cron o Supabase Edge Function): buscar citas próximas donde `reminderSent = false`, enviar email con Resend, marcar `reminderSent = true`

**Mobile:**
- [ ] `src/screens/appointments/AppointmentsScreen.tsx`
- [ ] `src/screens/appointments/AddAppointmentScreen.tsx`

---

### Feature 5 — Responsabilidades / Turnos
> Cubierto parcialmente por `Activity.assignedToId`. No requiere modelo nuevo.

- [ ] UI para ver quién tiene qué asignado (`FamilyScreen`)
- [ ] Filtro en `GET /api/activities?assignedToId=X`

---

### Feature 6 — Gastos Compartidos
**Backend:**
- [ ] Validación: suma de `splits` debe igualar `amount` del gasto (Zod + lógica en controlador)
- [ ] `PATCH /api/expenses/:expenseId/splits/:splitId/pay` — marcar split como pagado
- [ ] Agregar `updatedAt` a modelo `Expense` en schema (inconsistencia detectada)

**Mobile:**
- [ ] `src/screens/expenses/ExpensesScreen.tsx`

---

### Feature 7 — Notas Médicas
**Backend:**
- [ ] Rutas CRUD de `Note`
- [ ] Ordenar por `type = 'handoff'` primero, luego `createdAt DESC`

**Mobile:**
- [ ] `src/screens/notes/NotesScreen.tsx`

---

### Transversal — Antes del primer deploy
- [ ] `src/services/realtime.service.ts` — broadcast a canal `family:${familyId}`
- [ ] `src/services/email.service.ts` — wrapper de Resend
- [ ] `prisma/seed.ts` — familia de prueba con adulto mayor y 2 miembros
- [ ] Tests de RBAC para los 4 roles en al menos 2 dominios
- [ ] Checklist de seguridad pre-deploy de `skills/SECURITY.md`

---

## Resumen ejecutivo

```
ESTADO HOY (2026-06-03)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura monorepo        ████████████ 100%
Schema de BD (Prisma)           ████████████ 100%
Backend API (rutas/controladores)  ░░░░░░░░░░░░   0%
Mobile UI (pantallas)           ░░░░░░░░░░░░   0%
Mobile SDK 54 (setup)           ████████████ 100%
Tests                           ░░░░░░░░░░░░   0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MVP completado                  ████░░░░░░░░  ~25%
```

**Próximo sprint recomendado:** Feature 1 completo (Auth + Familia) en backend y mobile. Es el único bloqueante real — sin auth no se puede testear nada más. Tiempo estimado: 2-3 sesiones de trabajo.
