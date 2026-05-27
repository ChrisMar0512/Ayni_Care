# Ayni Care — Guías y Contexto para IA

App móvil de coordinación de cuidado para familias latinoamericanas que cuidan a un adulto mayor dependiente en casa. Reemplaza el caos de WhatsApp + papel + llamadas con un sistema compartido donde toda la red familiar opera con la misma información en tiempo real.

---

## 🚀 Ramas de Desarrollo para IA

Este repositorio contiene las guías de arquitectura, convenciones de desarrollo (skills) y configuraciones de agentes optimizadas para diferentes herramientas de Inteligencia Artificial.

Para mantener un entorno limpio y evitar conflictos de configuración entre herramientas de IA, **la rama `main` actúa como una guía central**. Todo el código y la infraestructura detallada están divididos en las siguientes ramas:

| Rama | IDE / Herramienta | Archivos Clave |
|------|-------------------|----------------|
| **[`antigravity`](https://github.com/ChrisMar0512/Ayni_Care/tree/antigravity)** | Antigravity IDE | `.agent/rules/ayni-care.md` (reglas autodetectadas), `skills/`, `AGENTS.md` |
| **[`claude-code`](https://github.com/ChrisMar0512/Ayni_Care/tree/claude-code)** | Claude Code (CLI) | `CLAUDE.md` (autodetectado por CLI), `skills/`, `AGENTS.md` |

---

## 🛠️ Stack Tecnológico

El proyecto está estructurado como un **Monorepo (npm workspaces)** y utiliza el siguiente stack tecnológico principal:

- **Mobile:** React Native + Expo (TypeScript) para la aplicación cliente.
- **Backend:** Node.js + Express (TypeScript) para la API del servidor.
- **Base de Datos & ORM:** PostgreSQL (alojado en Supabase) y Prisma ORM.
- **Autenticación:** Supabase Auth (OTP por teléfono o email).
- **Comunicación en Tiempo Real:** Supabase Realtime para sincronizar cambios familiares.
- **Gestión de Estado:** Zustand para estado local de la app y React Query (`@tanstack/react-query`) para la sincronización del servidor.
- **Estilos:** NativeWind (Tailwind CSS adaptado a React Native).
- **Servicio de Correos:** Resend + React Email para notificaciones y alertas.
- **Infraestructura:** GitHub Actions para el flujo de CI/CD.

---

## 📋 Features del MVP (En orden de prioridad)

El MVP de **Ayni Care** contempla las siguientes funcionalidades esenciales para la coordinación familiar:

1. **Auth + Grupo Familiar:** Registro y login seguro con OTP, creación de grupos familiares, invitaciones a otros miembros y roles definidos.
2. **Checklist de Actividades:** Tareas de cuidado diarias para el adulto mayor (baño, comida, paseos), con posibilidad de asignación y check de completado.
3. **Registro de Medicamentos:** Gestión de medicamentos activos, dosis, horarios y recordatorios automáticos.
4. **Calendario de Citas:** Gestión de citas médicas o eventos importantes, con recordatorios y envío de correos automáticos.
5. **Asignación de Responsabilidades:** Distribución clara de quién realiza cada tarea o turno.
6. **Gastos Compartidos:** Registro de compras y gastos médicos compartidos, división proporcional entre los familiares e historial de pagos.
7. **Notas Médicas y de Turno:** Anotaciones de eventos o el handoff (entrega de turno) para reportar novedades de salud del adulto mayor.

---

## 🧠 ¿Qué son los Skills?
Los **Skills** son archivos markdown de referencia que definen los estándares de código, patrones arquitectónicos y convenciones del proyecto. Le dan a la IA el contexto necesario para escribir código alineado con el proyecto.

Tenemos 7 Skills de referencia (disponibles en las ramas `antigravity` y `claude-code` dentro de `/skills`):

1. **`ARCHITECTURE.md` (Arquitectura):** Visión global del sistema y matriz detallada de permisos basados en roles (RBAC) para el cuidado familiar.
2. **`DATABASE.md` (Base de Datos):** Esquema de Prisma, modelado de datos y reglas de negocio para borrado lógico (Soft Delete) en todos los modelos MVP.
3. **`BACKEND.md` (Servidor):** Convenciones de desarrollo de la API REST con Node.js, Express y TypeScript, y manejo estricto de respuestas.
4. **`MOBILE.md` (Aplicación Móvil):** Convenciones y componentes UI/UX para React Native y Expo, tamaño mínimo de botones para adultos mayores, y políticas de caché con React Query.
5. **`SECURITY.md` (Seguridad):** Patrones de autenticación (OTP), rate limiting, sanitización de entradas de usuario y middleware de autorización.
6. **`QA.md` (Calidad y Testing):** Estrategias de pruebas unitarias y de integración, casos límite críticos para el cuidado médico y criterios de aceptación para el merge.
7. **`DEVOPS.md` (Despliegue y CI/CD):** Estructura de ramas Git, convenciones de commits, configuración de GitHub Actions y despliegue en Railway/Render/Expo EAS.

---

## 👥 ¿Qué son los Agentes?
Los **Agentes** son prompts de sistema (ubicados en `AGENTS.md`) que transforman a la IA en un desarrollador especializado para una tarea específica.

* **🏛️ Agente CTO:** Toma decisiones técnicas difíciles, resuelve conflictos de arquitectura o ayuda a planificar el sprint inicial de un feature.
* **⚙️ Agente Backend:** Construye modelos de datos, endpoints, validaciones con Zod, middleware y eventos en tiempo real.
* **📱 Agente Mobile:** Diseña pantallas responsivas con NativeWind, maneja estados locales de la app y consume servicios del backend.
* **🔍 Agente QA:** Escribe casos de prueba automatizados, identifica casos límite peligrosos (como pérdida de conexión) y valida el código antes de integrarlo.
* **🖥️ Agente DevOps:** Configura pipelines de CI/CD, deploys automáticos y variables de entorno para entornos de desarrollo y producción.

---

## 🔄 Flujo de Trabajo General para Implementar Features
Independientemente de la IA que utilices, debes seguir este flujo secuencial y ordenado para construir cualquier característica del MVP:

```
[Definición] ──> [opcional] CTO ──> Backend ──> Mobile ──> QA ──> Despliegue (DevOps)
```

### Paso 1: Definición y Planificación
Decide el feature a construir (por ejemplo: *Registro de Medicamentos*). Si el feature requiere decisiones técnicas complejas de base de datos o lógica, consulta primero al **Agente CTO** para alinear el diseño antes de escribir código.

### Paso 2: Desarrollo del Backend
Usa el **Agente Backend** para:
1. Diseñar y actualizar la base de datos (Prisma schema + migraciones).
2. Crear los endpoints correspondientes de la API en Express.
3. Implementar validación estricta con Zod y control de acceso (permisos/roles).
4. *Commit del backend una vez validado localmente.*

### Paso 3: Desarrollo del Mobile
Usa el **Agente Mobile** para:
1. Crear las pantallas y formularios en React Native.
2. Asegurar que las fuentes y los botones cumplan los requerimientos de accesibilidad.
3. Consumir los endpoints creados en el Paso 2 usando el cliente API compartido.
4. *Commit de la UI una vez verificada en el emulador/dispositivo.*

### Paso 4: Control de Calidad (QA)
Usa el **Agente QA** para:
1. Auditar los cambios realizados en Backend y Mobile.
2. Escribir pruebas unitarias y de integración (según `skills/QA.md`).
3. Comprobar casos límite críticos (ej. registrar dosis sin conexión a internet).
4. *Commit de los tests y aprobación final.*

### 💡 Regla de Oro
> **Una sesión = Un agente = Una tarea específica.**
> Nunca mezcles el desarrollo de frontend y backend en la misma conversación de chat. Separar el flujo en fases concretas reduce drásticamente los errores y optimiza el consumo de contexto de la IA.
