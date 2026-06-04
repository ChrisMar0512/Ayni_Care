# Ayni Care — Estado del Proyecto
> Última actualización: 2026-06-03

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

### Backend — Infraestructura base

#### Clientes y singletons
- `src/prisma/client.ts` — singleton de `PrismaClient` (reutilizado en dev y prod)
- `src/lib/supabase.ts` — `supabaseAdmin` (SERVICE_ROLE_KEY, bypasea RLS) + `supabase` (ANON_KEY para auth/realtime)

#### Middleware
- `src/middleware/auth.middleware.ts` — **`authenticate`**: verifica JWT con Supabase Admin SDK, busca `FamilyMember`, inyecta `req.user` con `{id, familyId, role, memberId}`. Retorna 401 si token inválido o usuario sin familia, 403 si cuenta inactiva
- `src/middleware/auth.middleware.ts` — **`authenticateNewUser`**: verifica JWT pero no requiere `FamilyMember` (para crear/unirse a familia). Rechaza con 409 si el usuario ya pertenece a una familia
- `src/middleware/authorize.middleware.ts` — **`requirePermission(...perms)`**: RBAC completo con los 4 roles, matriz de 18 permisos según `skills/SECURITY.md`
- `src/middleware/validate.middleware.ts` — **`validate(schema)`**: wrapper Zod que parsea `req.body` y lo carga en `req.validatedBody`; retorna 400 con el primer error descriptivo
- `src/middleware/error.middleware.ts` — handler global: maneja Prisma P2025 → 404, P2002 → 409, cualquier otro → 500 con mensaje oculto en producción
- `src/types/express.d.ts` — augmentación del tipo `Request` con `req.user` y `req.validatedBody`

#### Seguridad en `src/index.ts`
- CORS restrictivo: en producción solo `https://aynicare.com`; en desarrollo `*`
- Rate limiting general: 100 req / 15 min por IP
- Rate limiting en `/api/auth/`: 10 req / 15 min por IP

#### Servicios
- `src/services/realtime.service.ts` — `broadcast(familyId, event, payload)`: emite a canal `family:${familyId}` vía Supabase Realtime. Non-blocking
- `src/services/email.service.ts` — `sendInvitationEmail(...)`: envía invitación con link de join vía Resend

#### Auth — `POST /api/auth/verify-otp` y `POST /api/auth/logout`
- `src/schemas/auth.schema.ts` — Zod schema con `type`, `token`, `email?`, `phone?`
- `src/controllers/auth.controller.ts`:
  - `verifyOtp`: proxy a `supabase.auth.verifyOtp()`, retorna `{accessToken, refreshToken, expiresAt, user, member}`; `member` es null si el usuario aún no pertenece a ninguna familia
  - `logout`: llama `supabaseAdmin.auth.admin.signOut(userId, 'global')` — invalida todas las sesiones sin borrar el usuario
- `src/routes/auth.routes.ts`: `POST /api/auth/verify-otp` (sin auth, con validate) + `POST /api/auth/logout` (con authenticate)

#### Familia — 5 endpoints
- `src/schemas/family.schema.ts` — schemas para `createFamily`, `inviteMember`, `joinFamily`
- `src/controllers/family.controller.ts`:
  - `createFamily`: crea `Family` + `FamilyMember` como `primary_caregiver` + opcional `ElderlyPerson` en una sola transacción Prisma
  - `inviteMember`: crea `Invitation` (expira en 7 días), envía email con Resend (non-blocking si falla)
  - `joinFamily`: valida token, verifica no usado ni expirado, crea `FamilyMember` + marca `usedAt`, emite `family:member_joined`
  - `listMembers`: retorna miembros `isActive = true` de la familia del usuario
  - `removeMember`: verifica que el target es de la misma familia, no puede removerse a sí mismo, setea `isActive = false`, emite `family:member_removed`
- `src/routes/family.routes.ts`:
  - `POST /api/family` — `authenticateNewUser` + validate
  - `POST /api/family/join` — `authenticateNewUser` + validate
  - `POST /api/family/invite` — `authenticate` + `requirePermission('family:invite')` + validate
  - `GET /api/family/members` — `authenticate`
  - `DELETE /api/family/members/:id` — `authenticate` + `requirePermission('family:remove')`

### Mobile — Expo SDK 54 (setup)
- Actualización completada: expo `~54.0.0`, React `19.1.0`, React Native `0.81.5`
- Entry point `index.js` con `registerRootComponent` correcto para monorepo
- `metro.config.js` con `getDefaultConfig(__dirname)` — Expo detecta el monorepo automáticamente
- `babel.config.js` con `babel-preset-expo` (devDependency explícita)
- `tsconfig.json` mobile extiende `expo/tsconfig.base` + paths para `@ayni-care/shared` → fuente directa (no requiere build del paquete)
- `package.json` raíz fija `react@19.1.0` y `react-native@0.81.5` como deps directas (resuelve conflicto de versiones con nativewind)

### Mobile — Feature 1: Autenticación (implementado 2026-06-03)

#### Paquetes agregados
- `axios@^1.17.0` — cliente HTTP
- `expo-secure-store@~14.0.0` — almacenamiento seguro de tokens (SDK 54 compatible)

#### Cliente HTTP — `src/services/api.ts`
- Instancia axios con `baseURL: EXPO_PUBLIC_API_URL`, timeout 10 s
- Interceptor de request: lee `access_token` de SecureStore e inyecta `Authorization: Bearer`
- Interceptor de response: en 401 borra los 4 ítems de SecureStore (`access_token`, `refresh_token`, `auth_user`, `auth_member`) y llama `registerUnauthorizedCallback` → desacoplado del store para evitar dependencia circular
- `registerUnauthorizedCallback(cb)`: hook para que AppNavigator registre el `logout()` del store

#### Cliente Supabase — `src/services/supabase.ts`
- `createClient` con `persistSession: false`, `autoRefreshToken: false` — la sesión la gestiona el backend, Supabase solo envía OTPs

#### Auth Store — `src/stores/authStore.ts`
- Estado: `user`, `member`, `familyId`, `role`, `isInitialized`
- `initialize()`: lee `access_token` + `auth_user` + `auth_member` de SecureStore al arrancar; si existen, rehidrata el store sin network call
- `setAuth(user, member, accessToken, refreshToken)`: persiste en SecureStore y actualiza el estado en simultáneo (`Promise.all`)
- `logout()`: borra los 4 ítems de SecureStore + resetea el estado

#### Navegación — `src/navigation/`
- `types.ts`: `AuthStackParamList` (`Login`, `OTP` con `{type, identifier}`) y `AppStackParamList` (`Home`)
- `AppNavigator.tsx`:
  - `ErrorBoundary` (class component): captura errores de render, muestra pantalla de error con botón "Reintentar"
  - Splash mientras `isInitialized === false` (evita flash de login si hay sesión activa)
  - Monta `AuthNavigator` (Login → OTP) o `AppNavigatorInner` (Home) según `user` en el store
  - Registra el callback de 401 de `api.ts` en `useEffect`

#### Pantallas de auth — `src/screens/auth/`
- `LoginScreen.tsx`:
  - Detecta automáticamente si el input es email o teléfono (regex)
  - Teléfonos: normaliza a E.164 (`+countryCode...`) antes de llamar a Supabase
  - Llama `supabase.auth.signInWithOtp()` y navega a `OTPScreen` pasando `type` e `identifier`
  - Manejo de 3 estados: loading (ActivityIndicator en botón), error (texto rojo inline), idle
- `OTPScreen.tsx`:
  - 6 celdas individuales renderizadas sobre un `TextInput` oculto (mejor UX que un campo de texto plano)
  - Celda activa con borde terracota, celda rellena con borde verde salvia
  - POST `body` tipado según el schema del backend: `{type, token, email?} | {type, token, phone?}`
  - En éxito: llama `setAuth()` → el store actualiza → AppNavigator muestra HomeScreen automáticamente (sin `navigation.navigate`)
  - Botón "Verificar" deshabilitado si `otp.length < 6`

#### Pantalla placeholder — `src/screens/home/HomeScreen.tsx`
- Muestra nombre del usuario, nombre de la familia y botón "Cerrar sesión"
- Placeholder hasta implementar `TabNavigator` con las 5 tabs del MVP

#### `App.tsx`
- `QueryClient` con la config completa del `skills/MOBILE.md` (staleTime, gcTime, retry, retryDelay, refetchOnWindowFocus)
- Providers: `QueryClientProvider` → `SafeAreaProvider` → `AppNavigator`
- TypeScript pasa sin errores (`npx tsc --noEmit` ✅)

#### Nota sobre estilos
- Todos los archivos usan `StyleSheet.create()` — NativeWind sigue deshabilitado (incompatibilidad nativewind@4.2.4 + RN 0.81.5)
- Paleta aplicada: Terracota `#D4856A`, Verde Salvia `#87A96B`, Fondo `#F8F5F0`, Texto `#2C2C2C`

### `packages/shared`
- `ApiResponse<T>` definido con el formato correcto: `{ success, data, error? }`
- `MemberRole` type exportado y disponible para backend y mobile

---

## ❌ Lo que falta / No cumple los estándares

### Backend — Features 2-7 (sin implementar)

| # | Feature | Rutas pendientes |
|---|---------|-----------------|
| 1 | **Actividades** | `GET/POST /api/activities`, `PATCH /api/activities/:id`, `PATCH /api/activities/:id/complete`, `DELETE /api/activities/:id` |
| 2 | **Medicamentos** | `GET/POST /api/medications`, `PATCH /api/medications/:id`, `PATCH /api/medications/:id/administer`, `DELETE /api/medications/:id` |
| 3 | **Citas** | `GET/POST /api/appointments`, `PATCH /api/appointments/:id`, `DELETE /api/appointments/:id` + job de recordatorio |
| 4 | **Gastos** | `GET/POST /api/expenses`, `PATCH /api/expenses/:id/splits/:splitId/pay`, `DELETE /api/expenses/:id` |
| 5 | **Notas** | `GET/POST /api/notes`, `DELETE /api/notes/:id` |
| 6 | **Tests** | Ningún test de integración implementado |

### Backend — Detalles pendientes

| # | Problema | Detalle |
|---|----------|---------|
| 7 | **`prisma/seed.ts`** | Sin datos de prueba locales |
| 8 | **`Expense` sin `updatedAt`** | Inconsistencia con el resto de modelos |
| 9 | **Tests RBAC** | Cubrir los 4 roles en al menos 2 dominios (ver `skills/QA.md`) |

### Mobile — Pendientes

| # | Problema | Detalle |
|---|----------|---------|
| 10 | **`assets/` no existe** | `app.json` referencia `./assets/icon.png`, `splash.png`, `adaptive-icon.png` — expo-doctor reporta error |
| 11 | **NativeWind deshabilitado** | `withNativeWind` comentado en `metro.config.js` por incompatibilidad con nativewind@4.2.4 + RN 0.81.5 |
| 12 | **TabNavigator sin implementar** | `HomeScreen.tsx` es placeholder. Faltan las 5 tabs (Inicio, Actividades, Medicamentos, Agenda, Familia) |
| 13 | **Features 2-7 mobile** | Cero pantallas más allá del flujo de auth |
| 14 | **Sin tests de mobile** | Zero tests en React Native Testing Library |

---

## 🗺️ Próximos pasos por feature (orden de prioridad MVP)

### Feature 1 — Auth + Familia
**Backend:** ✅ Completo
- [x] `src/prisma/client.ts`
- [x] `src/middleware/auth.middleware.ts` — `authenticate` + `authenticateNewUser`
- [x] `src/middleware/authorize.middleware.ts` — `requirePermission()`
- [x] `src/middleware/validate.middleware.ts`
- [x] `src/middleware/error.middleware.ts`
- [x] CORS restrictivo + rate limiting en `src/index.ts`
- [x] `POST /api/auth/verify-otp` + `POST /api/auth/logout`
- [x] `POST /api/family`, `POST /api/family/invite`, `POST /api/family/join`
- [x] `GET /api/family/members`, `DELETE /api/family/members/:id`
- [x] `src/services/realtime.service.ts`
- [x] `src/services/email.service.ts`
- [ ] Tests de autorización: token sin bearer → 401, token expirado → 401, rol sin permiso → 403

**Mobile:** ✅ Flujo completo implementado
- [x] `src/services/api.ts` — axios con interceptores (token + 401 handler)
- [x] `src/services/supabase.ts` — cliente para enviar OTPs
- [x] `src/stores/authStore.ts` — Zustand + SecureStore (initialize, setAuth, logout)
- [x] `src/navigation/types.ts` — tipos tipados de los stacks
- [x] `src/navigation/AppNavigator.tsx` — ErrorBoundary + splash + switch auth/app
- [x] `src/screens/auth/LoginScreen.tsx` — email o teléfono → signInWithOtp
- [x] `src/screens/auth/OTPScreen.tsx` — 6 dígitos → verify-otp → setAuth
- [x] `src/screens/home/HomeScreen.tsx` — placeholder con logout
- [x] `App.tsx` — QueryClient + SafeAreaProvider + AppNavigator
- [ ] Crear `apps/mobile/assets/` con placeholders de Expo (expo-doctor)
- [ ] Resolver NativeWind o adoptar solución alternativa de estilos
- [ ] Tests

---

### Feature 2 — Checklist de Actividades
**Backend:**
- [ ] `src/schemas/activity.schema.ts`
- [ ] `src/routes/activities.routes.ts` + `src/controllers/activities.controller.ts`
  - `GET /api/activities` — filtrar por `familyId` + `deletedAt: null`
  - `POST /api/activities` — crear, broadcast `activity:created`
  - `PATCH /api/activities/:id` — actualizar, broadcast `activity:updated`
  - `PATCH /api/activities/:id/complete` — crea `ActivityLog`, broadcast `activity:completed`
  - `DELETE /api/activities/:id` — soft delete (`deletedAt = now()`)
- [ ] Tests: crear, completar, doble-completar (400), sin auth (401), rol sin permiso (403)

**Mobile:**
- [ ] `src/navigation/TabNavigator.tsx` — 5 tabs (Inicio, Actividades, Medicamentos, Agenda, Familia)
- [ ] `src/hooks/useActivities.ts` — React Query hooks
- [ ] `src/screens/activities/ActivitiesScreen.tsx`
- [ ] `src/components/activities/ActivityCard.tsx`

---

### Feature 3 — Medicamentos
**Backend:**
- [ ] `src/schemas/medication.schema.ts`
- [ ] Rutas CRUD + `PATCH /api/medications/:id/administer` (crea `MedLog`)

**Mobile:**
- [ ] `src/screens/medications/MedicationsScreen.tsx`
- [ ] `src/screens/medications/AddMedicationScreen.tsx`

---

### Feature 4 — Citas
**Backend:**
- [ ] Rutas CRUD de `Appointment`
- [ ] Job de recordatorio: buscar citas próximas donde `reminderSent = false`, enviar email, marcar `reminderSent = true`

**Mobile:**
- [ ] `src/screens/appointments/AppointmentsScreen.tsx`
- [ ] `src/screens/appointments/AddAppointmentScreen.tsx`

---

### Feature 5 — Responsabilidades / Turnos
> Cubierto parcialmente por `Activity.assignedToId`. No requiere modelo nuevo.

- [ ] Filtro en `GET /api/activities?assignedToId=X`
- [ ] UI para ver asignaciones por miembro

---

### Feature 6 — Gastos Compartidos
**Backend:**
- [ ] Validación: suma de `splits` debe igualar `amount` del gasto
- [ ] `PATCH /api/expenses/:expenseId/splits/:splitId/pay`
- [ ] Agregar `updatedAt` a modelo `Expense`

**Mobile:**
- [ ] `src/screens/expenses/ExpensesScreen.tsx`

---

### Feature 7 — Notas Médicas
**Backend:**
- [ ] Rutas CRUD de `Note`

**Mobile:**
- [ ] `src/screens/notes/NotesScreen.tsx`

---

### Transversal — Antes del primer deploy
- [x] `src/services/realtime.service.ts`
- [x] `src/services/email.service.ts`
- [ ] `prisma/seed.ts` — familia de prueba con adulto mayor y 2 miembros
- [ ] Tests de RBAC para los 4 roles en al menos 2 dominios
- [ ] Checklist de seguridad pre-deploy de `skills/SECURITY.md`

---

## Resumen ejecutivo

```
ESTADO HOY (2026-06-03)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura monorepo         ████████████ 100%
Schema de BD (Prisma)            ████████████ 100%
Backend — Infraestructura base   ████████████ 100%
Backend — Feature 1 (Auth+Fam)   ████████████ 100%
Backend — Features 2-7           ░░░░░░░░░░░░   0%
Mobile — SDK 54 setup            ████████████ 100%
Mobile — Feature 1 (Auth UI)     ██████████░░  85%  ← nuevo
Mobile — Features 2-7 UI         ░░░░░░░░░░░░   0%
Tests                            ░░░░░░░░░░░░   0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MVP completado                   ██████░░░░░░  ~45%
```

**Próximo sprint recomendado:** Feature 2 backend (actividades) + TabNavigator mobile. Con auth funcionando end-to-end y el TabNavigator en su lugar, se puede iterar rápido sobre las features restantes usando el mismo patrón de store + hooks + pantalla.
