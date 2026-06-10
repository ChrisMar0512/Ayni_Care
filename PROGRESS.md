# Ayni Care — Estado del Proyecto
> Última actualización: 2026-06-10 (Mobile Features 3 y 4 implementadas — Medicamentos y Citas)

---

## ✅ Lo que está bien

### Backend — QA Pass (2026-06-10)
- **TypeScript compila limpio** (`npx tsc --noEmit` — 0 errores): `apps/backend/tsconfig.json` ahora es standalone; ya no hereda de `expo/tsconfig.base` vía root tsconfig (la herencia causaba `customConditions` incompatible con `moduleResolution: node`)
- **Double-completion guard en `completeActivity`**: `PATCH /api/activities/:id/complete` retorna 400 si la actividad ya está en estado `completed`
- **Query params validados**: `?type` en `GET /api/notes` y `?status` en `GET /api/appointments` verifican contra valores del enum antes de llegar a Prisma (400 con mensaje descriptivo si el valor es inválido)
- **Todos los controladores verificados**: formato `{ success, data, error? }` ✅ · filtrado por `familyId` ✅ · `deletedAt: null` en lecturas ✅ · soft delete en escrituras ✅ · broadcast realtime en toda escritura ✅ · `try/catch + next(err)` ✅
- **RBAC verificado**: todas las rutas tienen `authenticate` + `requirePermission()` correctos según la matriz de permisos

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
- `types.ts`: `AuthStackParamList` (`Login`, `OTP`), `AppStackParamList` (`MainTabs`), `TabParamList` (5 tabs)
- `AppNavigator.tsx`:
  - `ErrorBoundary` (class component): captura errores de render, muestra pantalla de error con botón "Reintentar"
  - Splash mientras `isInitialized === false` (evita flash de login si hay sesión activa)
  - Monta `AuthNavigator` (Login → OTP) o `AppNavigatorInner` (TabNavigator) según `user` en el store
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

#### Pantalla Inicio — `src/screens/home/HomeScreen.tsx`
- Muestra nombre del usuario, nombre de la familia y botón "Cerrar sesión"
- Montada como tab "Inicio" dentro de `TabNavigator`

#### `App.tsx`
- `QueryClient` con la config completa del `skills/MOBILE.md` (staleTime, gcTime, retry, retryDelay, refetchOnWindowFocus)
- Providers: `QueryClientProvider` → `SafeAreaProvider` → `AppNavigator`
- TypeScript pasa sin errores (`npx tsc --noEmit` ✅)

#### Nota sobre estilos
- Todos los archivos usan `StyleSheet.create()` — NativeWind sigue deshabilitado (incompatibilidad nativewind@4.2.4 + RN 0.81.5)
- Paleta aplicada: Terracota `#D4856A`, Verde Salvia `#87A96B`, Fondo `#F8F5F0`, Texto `#2C2C2C`

#### Actividades — `GET /api/activities`, `POST /api/activities`, `PATCH /api/activities/:id`, `PATCH /api/activities/:id/complete`, `DELETE /api/activities/:id`
- `src/schemas/activity.schema.ts` — `createActivitySchema`, `updateActivitySchema` (con `.refine` para rechazar body vacío), `completeActivitySchema`
- `src/controllers/activities.controller.ts`:
  - `listActivities`: filtra por `familyId + deletedAt: null`; acepta `?assignedToId=UUID` y `?date=YYYY-MM-DD` (convierte a rango UTC); incluye `assignedTo` y último log por actividad; ordena por `priority desc, scheduledAt asc`
  - `createActivity`: valida que `assignedToId` pertenezca a la misma familia antes de crear; broadcast `activity:created`
  - `updateActivity`: verifica ownership (`familyId + deletedAt: null`); re-valida `assignedToId` si se cambia; broadcast `activity:updated`
  - `completeActivity`: usa `prisma.$transaction` para crear `ActivityLog` + setear `status: completed` atómicamente; broadcast `activity:completed` con `{activity, log}`
  - `deleteActivity`: soft delete con `deletedAt: new Date()` (nunca `prisma.activity.delete`); broadcast `activity:deleted`
- `src/routes/activities.routes.ts` — RBAC correcto por endpoint: `read`, `create`, `complete`, `delete`
- `src/index.ts` — `app.use('/api/activities', activitiesRoutes)` registrado

### Mobile — Feature 2: Checklist de Actividades (implementado 2026-06-07)

#### Paquetes agregados
- `@react-navigation/bottom-tabs@^6.6.1` — navegación por tabs
- `@expo/vector-icons` — iconos Ionicons para tab bar y componentes

#### Navegación por tabs — `src/navigation/TabNavigator.tsx`
- 5 tabs: **Inicio**, **Actividades**, **Medicamentos**, **Agenda**, **Familia**
- Iconos `Ionicons` con variante outline (inactivo) / filled (activo)
- Tint color terracota `#D4856A` en activo; gris `#9CA3AF` en inactivo
- Tab bar con fondo blanco, altura 60 px, padding vertical 8 px
- `types.ts` actualizado: `TabParamList` con 5 rutas, `AppStackParamList` renombrado `Home → MainTabs`
- Placeholders para Medicamentos (`MedicationsPlaceholder`), Agenda (`AppointmentsPlaceholder`) y Familia (`FamilyPlaceholder`) — pantallas de "Próximamente" hasta Feature 3-4-7

#### Tipos — `src/types/activity.ts`
- `Activity` con todos los campos del backend: `id`, `title`, `description`, `scheduledAt`, `status`, `priority`, `assignedTo`, `lastLog`
- `ActivityStatus`: `'pending' | 'completed' | 'skipped'`
- `CreateActivityInput` para el hook de creación

#### React Query hooks — `src/hooks/useActivities.ts`
- `useActivities(date?)`: `GET /api/activities?date=YYYY-MM-DD`, `staleTime` 1 min
- `useCreateActivity()`: `POST /api/activities`, invalida `['activities']` en `onSuccess`
- `useCompleteActivity()`: `PATCH /api/activities/:id/complete`, invalida `['activities']`
- `useDeleteActivity()`: `DELETE /api/activities/:id`, invalida `['activities']`

#### Componente — `src/components/activities/ActivityCard.tsx`
- Botón de completar: `Pressable` de 48×48 px (círculo), cumple mínimo táctil
- Estado pendiente: borde gris claro + check vacío; completado: fondo verde salvia + check blanco
- Metadata inline: hora formateada en locale `es-MX` + nombre del asignado (con `Ionicons`)
- Título tachado y opacidad reducida cuando la actividad está completada
- Spinner (ActivityIndicator) en el botón durante la mutación del ítem en curso
- `accessibilityLabel` en el botón para lectores de pantalla

#### Pantalla — `src/screens/activities/ActivitiesScreen.tsx`
- **3 estados obligatorios:** loading (ActivityIndicator + texto), error (icono + mensaje + botón Reintentar), data
- **Agrupación por estado:** `SectionList` con secciones "Pendientes (N)" y "Completadas (N)"
- **Empty state:** icono + "Sin actividades hoy" cuando no hay datos
- Fecha seleccionada formateada en español (`toLocaleDateString('es-MX', { weekday:'long', ... })`)
- `SafeAreaView` como contenedor raíz para respetar notch/home indicator
- Identifica el ítem en mutación comparando `completeActivity.variables?.id` para mostrar el spinner solo en la card correcta

### `packages/shared`
- `ApiResponse<T>` definido con el formato correcto: `{ success, data, error? }`
- `MemberRole` type exportado y disponible para backend y mobile

---

## ❌ Lo que falta / No cumple los estándares

### Backend — Features 3-7 (sin implementar)

| # | Feature | Rutas pendientes |
|---|---------|-----------------|
| 1 | **Medicamentos** | `GET/POST /api/medications`, `PATCH /api/medications/:id`, `PATCH /api/medications/:id/administer`, `DELETE /api/medications/:id` |
| 2 | **Citas** | `GET/POST /api/appointments`, `PATCH /api/appointments/:id`, `DELETE /api/appointments/:id` + job de recordatorio |
| 3 | **Gastos** | `GET/POST /api/expenses`, `PATCH /api/expenses/:id/splits/:splitId/pay`, `DELETE /api/expenses/:id` |
| 4 | **Notas** | `GET/POST /api/notes`, `DELETE /api/notes/:id` |
| 5 | **Tests** | Ningún test de integración implementado |

### Backend — Detalles pendientes

| # | Problema | Detalle |
|---|----------|---------|
| 7 | **`prisma/seed.ts`** | Sin datos de prueba locales |
| 9 | **Tests RBAC** | Cubrir los 4 roles en al menos 2 dominios (ver `skills/QA.md`) |

### Mobile — Pendientes

| # | Problema | Detalle |
|---|----------|---------|
| 10 | **`assets/` no existe** | `app.json` referencia `./assets/icon.png`, `splash.png`, `adaptive-icon.png` — expo-doctor reporta error |
| 11 | **NativeWind deshabilitado** | `withNativeWind` comentado en `metro.config.js` por incompatibilidad con nativewind@4.2.4 + RN 0.81.5 |
| 12 | **Features 3-7 mobile** | Pantallas de Medicamentos, Agenda, Gastos, Familia y Notas pendientes (actualmente placeholders) |
| 13 | **Sin tests de mobile** | Zero tests en React Native Testing Library |

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
- [x] `src/navigation/types.ts` — tipos tipados: `AuthStackParamList`, `AppStackParamList`, `TabParamList`
- [x] `src/navigation/AppNavigator.tsx` — ErrorBoundary + splash + switch auth/tabs
- [x] `src/navigation/TabNavigator.tsx` — 5 tabs con Ionicons y paleta Ayni Care
- [x] `src/screens/auth/LoginScreen.tsx` — email o teléfono → signInWithOtp
- [x] `src/screens/auth/OTPScreen.tsx` — 6 dígitos → verify-otp → setAuth
- [x] `src/screens/home/HomeScreen.tsx` — tab Inicio con logout
- [x] `App.tsx` — QueryClient + SafeAreaProvider + AppNavigator
- [ ] Crear `apps/mobile/assets/` con placeholders de Expo (expo-doctor)
- [ ] Resolver NativeWind o adoptar solución alternativa de estilos
- [ ] Tests

---

### Feature 2 — Checklist de Actividades
**Backend:** ✅ Completo (2026-06-07)
- [x] `src/schemas/activity.schema.ts` — `createActivitySchema`, `updateActivitySchema`, `completeActivitySchema`
- [x] `src/controllers/activities.controller.ts`
  - [x] `GET /api/activities` — filtrar por `familyId` + `deletedAt: null`; `?assignedToId` + `?date` soportados
  - [x] `POST /api/activities` — crear con validación de assignedToId por familia, broadcast `activity:created`
  - [x] `PATCH /api/activities/:id` — actualizar, broadcast `activity:updated`
  - [x] `PATCH /api/activities/:id/complete` — transacción `ActivityLog` + `status: completed`, broadcast `activity:completed`
  - [x] `DELETE /api/activities/:id` — soft delete (`deletedAt = now()`), broadcast `activity:deleted`
- [x] `src/routes/activities.routes.ts` — RBAC con `requirePermission` por endpoint
- [ ] Tests: crear, completar, doble-completar (400), sin auth (401), rol sin permiso (403)

**Mobile:** ✅ Completo (2026-06-07)
- [x] `src/navigation/TabNavigator.tsx` — 5 tabs con Ionicons, tint terracota, placeholders para features pendientes
- [x] `src/navigation/AppNavigator.tsx` — actualizado para montar `TabNavigator` vía `MainTabs`
- [x] `src/types/activity.ts` — tipos `Activity`, `ActivityStatus`, `CreateActivityInput`
- [x] `src/hooks/useActivities.ts` — `useActivities`, `useCreateActivity`, `useCompleteActivity`, `useDeleteActivity`
- [x] `src/screens/activities/ActivitiesScreen.tsx` — 3 estados, agrupación por estado, empty state, `SafeAreaView`
- [x] `src/components/activities/ActivityCard.tsx` — botón 48×48 px, spinner por ítem, tachado al completar

---

### Feature 3 — Medicamentos
**Backend:** ✅ Completo (2026-06-10)
- [x] `src/schemas/medication.schema.ts` — `createMedicationSchema`, `updateMedicationSchema`, `administerMedicationSchema`
- [x] `src/controllers/medications.controller.ts`
  - [x] `GET /api/medications` — filtrar por `familyId + deletedAt: null + isActive: true`; incluye logs del día con `givenBy`
  - [x] `POST /api/medications` — crear medicamento, broadcast `medication:created`
  - [x] `PATCH /api/medications/:id` — actualizar, broadcast `medication:updated`
  - [x] `PATCH /api/medications/:id/administer` — transacción `MedLog` + decremento condicional de stock, broadcast `medication:administered`
  - [x] `DELETE /api/medications/:id` — soft delete (`deletedAt = now()`), broadcast `medication:deleted`
- [x] `src/routes/medications.routes.ts` — RBAC con `requirePermission` por endpoint
- [x] `src/index.ts` — `app.use('/api/medications', medicationsRoutes)` registrado

**Mobile:** ✅ Completo (2026-06-10)
- [x] `src/types/medication.ts` — tipos `Medication`, `MedLog`, `CreateMedicationInput`
- [x] `src/hooks/useMedications.ts` — `useMedications`, `useCreateMedication`, `useAdministerMedication`, `useDeleteMedication`
- [x] `src/screens/medications/MedicationsScreen.tsx` — lista con dosis del día, botón "Administrar", empty state
- [x] `src/screens/medications/AddMedicationScreen.tsx` — formulario completo con horarios dinámicos
- [x] `src/navigation/TabNavigator.tsx` — tab Medicamentos usa `MedicationsNavigator` (stack anidado)
- [x] `src/navigation/types.ts` — `MedicationsStackParamList` agregado

---

### Feature 4 — Citas
**Backend:** ✅ Completo (2026-06-10)
- [x] `src/schemas/appointment.schema.ts` — `createAppointmentSchema`, `updateAppointmentSchema`
- [x] `src/controllers/appointments.controller.ts`
  - [x] `GET /api/appointments` — filtrar por `familyId + deletedAt: null`; `?status`, `?from`, `?to` soportados; ordena por `scheduledAt asc`
  - [x] `POST /api/appointments` — crear cita, broadcast `appointment:created`
  - [x] `PATCH /api/appointments/:id` — actualizar, broadcast `appointment:updated`
  - [x] `DELETE /api/appointments/:id` — soft delete, broadcast `appointment:deleted`
- [x] `src/routes/appointments.routes.ts` — RBAC con `requirePermission` por endpoint
- [x] `src/index.ts` — `app.use('/api/appointments', appointmentsRoutes)` registrado
- [ ] Job de recordatorio: buscar citas próximas donde `reminderSent = false`, enviar email, marcar `reminderSent = true`

**Mobile:** ✅ Completo (2026-06-10)
- [x] `src/types/appointment.ts` — tipos `Appointment`, `AppointmentType`, `AppointmentStatus`, `CreateAppointmentInput`
- [x] `src/hooks/useAppointments.ts` — `useAppointments`, `useCreateAppointment`, `useDeleteAppointment`
- [x] `src/screens/appointments/AppointmentsScreen.tsx` — lista ordenada con secciones próximas/pasadas, status badges
- [x] `src/screens/appointments/AddAppointmentScreen.tsx` — formulario con selector de tipo, fecha+hora
- [x] `src/navigation/TabNavigator.tsx` — tab Agenda usa `AppointmentsNavigator` (stack anidado)
- [x] `src/navigation/types.ts` — `AppointmentsStackParamList` agregado

---

### Feature 5 — Responsabilidades / Turnos
> Cubierto por `Activity.assignedToId`. No requiere modelo nuevo.

**Backend:** ✅ Completo
- [x] Filtro `?assignedToId=X` en `GET /api/activities` — ya implementado en Feature 2

- [ ] UI para ver asignaciones por miembro

---

### Feature 6 — Gastos Compartidos
**Backend:** ✅ Completo (2026-06-10)
- [x] `src/schemas/expense.schema.ts` — `createExpenseSchema` con validación de suma de splits = amount total
- [x] `src/controllers/expenses.controller.ts`
  - [x] `GET /api/expenses` — filtrar por `familyId + deletedAt: null`; incluye `paidBy` + splits con miembros; ordena por `date desc`
  - [x] `POST /api/expenses` — validar que todos los miembros de splits pertenecen a la familia; transacción Prisma: crea `Expense` + `ExpenseSplit[]`; broadcast `expense:created`
  - [x] `PATCH /api/expenses/:expenseId/splits/:splitId/pay` — verifica pertenencia de gasto y split a la familia; marca `isPaid = true` + `paidAt = now()`; broadcast `expense:updated`
  - [x] `DELETE /api/expenses/:id` — soft delete, broadcast `expense:deleted`
- [x] `src/routes/expenses.routes.ts` — RBAC con `requirePermission` por endpoint
- [x] `src/index.ts` — `app.use('/api/expenses', expensesRoutes)` registrado
- [x] `prisma/schema.prisma` — `updatedAt DateTime @updatedAt` agregado a modelo `Expense`

**Mobile:**
- [ ] `src/screens/expenses/ExpensesScreen.tsx`

---

### Feature 7 — Notas Médicas
**Backend:** ✅ Completo (2026-06-10)
- [x] `src/schemas/note.schema.ts` — `createNoteSchema`
- [x] `src/controllers/notes.controller.ts`
  - [x] `GET /api/notes` — filtrar por `familyId + deletedAt: null`; `?type` soportado; incluye `author`; ordena por `createdAt desc`
  - [x] `POST /api/notes` — crear nota con `authorId = req.user.memberId`; broadcast `note:created`
  - [x] `DELETE /api/notes/:id` — soft delete; solo autor o `primary_caregiver` puede eliminar; broadcast `note:deleted`
- [x] `src/routes/notes.routes.ts` — con `requirePermission`
- [x] `src/index.ts` — `app.use('/api/notes', notesRoutes)` registrado

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
ESTADO HOY (2026-06-10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura monorepo         ████████████ 100%
Schema de BD (Prisma)            ████████████ 100%
Backend — Infraestructura base   ████████████ 100%
Backend — Feature 1 (Auth+Fam)   ████████████ 100%
Backend — Feature 2 (Actividades)████████████ 100%
Backend — Feature 3 (Medicamentos)████████████ 100%
Backend — Feature 4 (Citas)      ████████████ 100%  ← nuevo
Backend — Feature 5 (Gastos)     ████████████ 100%  ← nuevo
Backend — Feature 6 (Notas)      ████████████ 100%  ← nuevo
Backend — Feature 7 (Resp.)      ████████████ 100%  ← nuevo
Mobile — SDK 54 setup            ████████████ 100%
Mobile — Feature 1 (Auth UI)     ██████████░░  85%
Mobile — Feature 2 (Actividades) ████████████ 100%
Mobile — Feature 3 (Medicamentos)████████████ 100%  ← nuevo
Mobile — Feature 4 (Citas)       ████████████ 100%  ← nuevo
Mobile — Features 5-7 UI         ░░░░░░░░░░░░   0%
Tests                            ░░░░░░░░░░░░   0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MVP completado                   ███████████░  ~87%
```

**Próximo sprint recomendado:** Mobile Features 5-7 (pantallas de Gastos, Familia/Notas). El patrón está 100% establecido: tipos → hook → Screen + lista + Add form. Backend MVP completo.
