# 🚀 Guía de Inicio y Comandos — Ayni Care

Esta guía centraliza todas las instrucciones, comandos y enlaces necesarios para iniciar, probar y desplegar los diferentes componentes del ecosistema **Ayni Care**.

---

## 🏛️ Estructura General del Monorepo

El monorepo está construido con **NPM Workspaces** y consta de:
*   [**`apps/backend`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/backend): API REST con Express + TypeScript + Prisma.
*   [**`apps/mobile`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/mobile): Aplicación móvil híbrida con React Native + Expo.
*   [**`packages/shared`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/packages/shared): Tipos y contratos TypeScript reutilizados por el backend y móvil.

---

## 🛠️ Requisitos Previos y Preparación

Antes de iniciar cualquier componente, clona el repositorio e instala todas las dependencias en la raíz:

```bash
# Instalar dependencias para todos los espacios de trabajo
npm install
```

---

## ⚙️ 1. Servidor Backend (API REST)

El backend procesa toda la lógica de negocio, autenticación, envío de correos, persistencia en base de datos PostgreSQL en Supabase, y difusión en tiempo real.

### Comandos de Ejecución Local
Puedes iniciar el backend desde la raíz o dentro de su propia carpeta:

*   **Desde la raíz:**
    ```bash
    npm run dev:backend
    ```
*   **Desde la carpeta del backend:**
    ```bash
    cd apps/backend
    npm run dev
    ```

### URLs y Enlaces Clave (Local)
*   **URL Base:** `http://localhost:3000`
*   **Health Check (Estado de salud):** [http://localhost:3000/health](http://localhost:3000/health) *(Verifica la conexión con la base de datos)*

### Enlace Desplegado (Producción)
*   **API en Producción:** `https://ayni-care-backend.vercel.app`
*   **Health Check Producción:** [https://ayni-care-backend.vercel.app/health](https://ayni-care-backend.vercel.app/health)

---

## 📱 2. Aplicación Móvil (React Native + Expo)

La aplicación móvil es el cliente para los cuidadores de la familia.

### Comandos de Ejecución Local
*   **Desde la raíz:**
    ```bash
    npm run dev:mobile
    ```
*   **Desde la carpeta mobile:**
    ```bash
    cd apps/mobile
    npx expo start
    ```

### Instrucciones de Visualización
1.  Instala la aplicación **Expo Go** en tu dispositivo físico Android o iOS.
2.  Asegúrate de que tu celular y tu computadora estén conectados a la **misma red Wi-Fi**.
3.  Escanea el código QR que se imprime en la terminal tras ejecutar el comando de inicio.
4.  *Para emuladores:* Presiona `a` en la terminal para abrir el emulador de Android o `i` para el simulador de iOS.

---

## 🖥️ 3. Dashboard Administrativo y Control de Calidad

Este panel interactivo permite auditar el comportamiento del MVP, la base de datos y la distribución de roles familiares.

### Enlaces de Acceso (Dashboard)
El dashboard requiere un parámetro de token de acceso para desbloquearse:

*   **Acceso Local:** [http://localhost:3000/admin?token=aynicare-admin-2026](http://localhost:3000/admin?token=aynicare-admin-2026)
*   **Acceso en Producción (Vercel):** [https://ayni-care-backend.vercel.app/admin?token=aynicare-admin-2026](https://ayni-care-backend.vercel.app/admin?token=aynicare-admin-2026)

---

## 🧪 4. Suite de Tests de Integración (RBAC)

Configurada con Jest + Supertest para asegurar la validez de los roles familiares (`primary_caregiver`, `paid_caregiver`, `remote_family`) en los endpoints sensibles.

### Comandos de Ejecución
*   **Correr toda la suite de pruebas (desde la carpeta backend):**
    ```bash
    cd apps/backend
    npm run test
    ```
*   **Correr un bloque de pruebas específico (ej. gastos):**
    ```bash
    cd apps/backend
    npx jest -t "Control de Acceso de Gastos"
    ```

---

## 🔔 5. Disparador Manual de Recordatorios (Push)

Si deseas probar el envío de notificaciones push de recordatorios de medicamentos y citas de forma manual, puedes llamar al endpoint del Cron Job:

*   **Disparador Local:**
    ```bash
    curl http://localhost:3000/api/jobs/reminders
    ```
*   **Disparador en Producción (Requiere Secreto):**
    ```
    https://ayni-care-backend.vercel.app/api/jobs/reminders?secret=TU_CRON_SECRET
    ```

---

## 📁 Archivos Clave del Ecosistema

*   [**`package.json` (Raíz)**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/package.json): Configuración de NPM workspaces y scripts globales de inicio.
*   [**`vercel.json` (Raíz)**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/vercel.json): Configuración de enrutamiento y frecuencia del cron job en producción.
*   [**`apps/backend/src/app.ts`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/backend/src/app.ts): Configuración y ruteo central de la Express App.
*   [**`apps/backend/src/index.ts`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/backend/src/index.ts): Punto de entrada y levantamiento del puerto local del backend.
*   [**`apps/backend/test/rbac.test.ts`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/backend/test/rbac.test.ts): Archivo de especificación de los 7 tests de seguridad e integración de roles.
*   [**`apps/mobile/App.tsx`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/mobile/App.tsx): Configuración del React Query persistente para el caché offline.
*   [**`TESTING_NOTIFICATIONS.md`**](file:///c:/Ayni%20Care/Ayni%20Care%20Github/TESTING_NOTIFICATIONS.md): Guía de pruebas de notificaciones locales y en Expo Go.
