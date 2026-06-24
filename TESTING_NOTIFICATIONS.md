# Guía de Inicio y Pruebas de Notificaciones Push — Ayni Care

Esta guía detalla los comandos para iniciar tanto el backend como la aplicación móvil (Expo), la configuración de variables de entorno y los pasos exactos para simular y probar las notificaciones push en dispositivos físicos.

---

## 📋 Requisitos Previos y Configuración

Antes de ejecutar las pruebas en un celular real, asegúrate de tener configurados estos dos archivos clave:

### 1. Vincular el Proyecto con tu Cuenta de Expo
En [`apps/mobile/app.json`](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/mobile/app.json), verifica que exista tu `projectId` de Expo dentro de la propiedad `extra.eas`:
```json
{
  "expo": {
    "name": "Ayni Care",
    "slug": "ayni-care",
    "extra": {
      "eas": {
        "projectId": "ecace12d-4812-4bfb-a4c1-4ee5cfda5269"
      }
    }
  }
}
```

### 2. Configurar la URL de la API Móvil
En [`apps/mobile/.env`](file:///c:/Ayni%20Care/Ayni%20Care%20Github/apps/mobile/.env), la variable `EXPO_PUBLIC_API_URL` **no puede ser localhost ni 127.0.0.1** cuando pruebas en un celular real, ya que el celular intentará conectarse a sí mismo y dará `Network Error`.

*   **Opción A (Recomendada - Conectar a Servidor Desplegado):**
    ```env
    EXPO_PUBLIC_API_URL=https://ayni-care-backend.vercel.app
    ```
*   **Opción B (Conectar a Servidor Local mediante tu IP):**
    Asegúrate de que tu celular y tu PC estén en la misma red Wi-Fi y usa la IP local de tu computadora (por ejemplo, `192.168.1.41`):
    ```env
    EXPO_PUBLIC_API_URL=http://192.168.1.41:3000
    ```

---

## 🚀 Comandos para Iniciar los Proyectos

### 1. Iniciar el Servidor Backend (Local)
Abre una terminal en la raíz del proyecto y ejecuta:
```bash
cd apps/backend
npm run dev
```
*El servidor levantará la API REST por defecto en `http://localhost:3000`.*

### 2. Iniciar el Bundler de Expo (Mobile)
Abre otra terminal en la raíz del proyecto y ejecuta:
```bash
cd apps/mobile
npx expo start
```
*   **Prompt de Inicio de Sesión de Expo:** Cuando aparezca el prompt de inicio de sesión de Expo en la terminal, utiliza las **flechas del teclado** para seleccionar **`Proceed anonymously`** (Proceder de forma anónima) y presiona **Enter**.
*   **Solución a problemas de conexión (Timeout):**
    Si al escanear el código QR con el celular se queda cargando y arroja "Timeout", el Firewall de tu Windows está bloqueando el puerto de desarrollo (`8081`).
    1.  **Perfil de Red en Windows:** Ve a la configuración de red de tu PC (Ethernet o Wi-Fi) y cambia el perfil de red de **Público** a **Privado**. Esto abrirá automáticamente los puertos locales para comunicación móvil.
    2.  **Zona Wi-Fi (Hotspot):** Alternativamente, puedes activar el "Anclaje de red / Zona Wi-Fi" de tu celular, conectar tu computadora a esa red móvil y arrancar `npx expo start`.

---

## 📱 Ejecutar la App en tu Celular
1.  Descarga la aplicación oficial **Expo Go** en tu dispositivo móvil (disponible gratis en Google Play Store y Apple App Store).
2.  Asegúrate de iniciar sesión en la app Expo Go de tu celular con la misma cuenta con la que registraste el `projectId`.
3.  Escanea el código QR que se imprime en tu terminal usando la cámara de tu iPhone o la app de Expo Go en Android.
4.  Inicia sesión en la app Ayni Care desde tu celular físico.
5.  Acepta la alerta del sistema que solicita **"Permiso para notificaciones push"**.
6.  En tu terminal de desarrollo en la computadora verás el log:
    `LOG  [PushNotifications] Token registrado exitosamente: ExponentPushToken[xxxxxxxxxxxx]`

---

## 🧪 Pasos para Probar las Notificaciones Push

### Método 1: Prueba de Conectividad con la Web de Expo (Directo)
1.  Copia tu token registrado de la consola o la base de datos (ej. `ExponentPushToken[_7F0ckIIW2vsDJbNEtV-1H]`).
2.  Entra en tu navegador a: **[Expo Push Notification Tool](https://expo.dev/notifications)**.
3.  Llena el formulario con:
    *   **Recipient (Expo push token):** Pega tu token completo con corchetes.
    *   **Access Token:** Déjalo completamente **vacío**.
    *   **Message Title:** `Prueba de Ayni Care`
    *   **Message Body:** `Tu notificación push ha llegado correctamente.`
4.  Bloquea la pantalla de tu celular (o sal de la aplicación móvil dejándola en segundo plano).
5.  Presiona el botón azul **Send a test notification** en la página web. Tu celular debería vibrar y mostrar la notificación push nativa.

---

### Método 2: Simular Flujo Real mediante Creación de Actividades (Evento 1)
El backend está programado para notificar instantáneamente a todos los miembros activos de la familia cada vez que alguien agrega una nueva tarea, excluyendo al creador.
1.  Mantén tu sesión de Ayni Care abierta en tu celular (donde registraste el token push). **Deja el celular con la pantalla bloqueada.**
2.  Inicia sesión en la aplicación con una **segunda cuenta de prueba** vinculada a la misma familia (puedes abrir la versión web en `http://localhost:8081` en tu PC o usar Postman).
3.  Desde la segunda cuenta en la PC, **crea una nueva actividad** (ej. "Control de presión").
4.  Al guardar, el backend ejecutará la lógica, consultará tu token y te enviará un push diciendo:
    *   **Título:** `🆕 Nueva actividad: Control de presión`
    *   **Cuerpo:** `[Nombre del creador] agregó la actividad "Control de presión".`

---

### Método 3: Validar Recordatorios de Agenda y Medicación (Evento 2 - Cron Jobs)
El backend cuenta con una tarea en segundo plano (*cron-job*) que monitorea actividades y citas próximas a suceder en los siguientes 20 minutos para enviar un recordatorio automático.
1.  Desde tu celular físico, **crea una nueva actividad programada para dentro de 10 o 15 minutos** (por ejemplo, si son las 09:40, prográmala para las 09:55).
2.  Bloquea la pantalla de tu celular o déjala en segundo plano.
3.  En tu navegador de la computadora, simula el disparador del Cron Job ingresando a la URL del backend:
    *   **URL Local:** `http://localhost:3000/api/jobs/reminders`
    *   **URL Producción Vercel:** `https://ayni-care-backend.vercel.app/api/jobs/reminders` *(Nota: Si está en modo de producción estricta, podría requerir agregar el parámetro del secreto en la URL: `?secret=TU_CRON_SECRET`).*
4.  El servidor retornará un JSON confirmando el procesamiento de los recordatorios y tu celular recibirá inmediatamente la notificación nativa:
    *   **Título:** `⏱️ Actividad próxima: [Nombre de tu Actividad]`
    *   **Cuerpo:** `Faltan unos 15 minutos para la actividad programada: [Hora local]`
