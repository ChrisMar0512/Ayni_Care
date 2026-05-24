# Ayni Care

App móvil de coordinación de cuidado para familias latinoamericanas que cuidan a un adulto mayor dependiente en casa. Reemplaza el caos de WhatsApp + papel + llamadas con un sistema compartido donde toda la red familiar opera con la misma información en tiempo real.

---

## Antes de empezar — lee esto

Este proyecto usa un sistema de **skills** y **agentes** para trabajar con IA (Claude Code / Antigravity) de forma ordenada y eficiente. Todo el equipo debe seguir este flujo para mantener consistencia en el código.

---

## Estructura de archivos importantes

```
ayni-care/
├── CLAUDE.md        ← Claude Code lo lee automáticamente al abrir el proyecto
├── AGENTS.md        ← Los prompts listos para cada agente
├── README.md        ← este archivo
└── skills/
    ├── ARCHITECTURE.md   ← visión global del sistema
    ├── BACKEND.md        ← convenciones del servidor
    ├── MOBILE.md         ← convenciones de la app
    ├── DATABASE.md       ← schema de BD y reglas de Prisma
    └── QA.md             ← patrones de testing
```

---

## ¿Qué son los skills?

Los skills son archivos `.md` que le dan contexto permanente al agente de IA. Contienen el stack, la estructura de carpetas, las convenciones de código y las reglas del proyecto.

**Sin skills:** cada vez que abres una sesión nueva el agente no sabe nada de tu proyecto y genera código genérico que no encaja.

**Con skills:** el agente conoce exactamente cómo está estructurado el proyecto, qué librerías usamos y cuáles son las convenciones. El código generado encaja directo en el repo.

> `CLAUDE.md` es el skill principal. Claude Code lo detecta y lee automáticamente cuando abres el proyecto. Los demás skills en `/skills` se referencian desde los prompts de cada agente.

---

## ¿Qué son los agentes?

Son roles especializados que le asignas al agente de IA para cada tarea. Cada agente tiene su propio prompt en `AGENTS.md` con instrucciones específicas para su área.

| Agente | Cuándo usarlo |
|--------|---------------|
| **CTO** | Decisiones técnicas difíciles, dudas de arquitectura, no sabes por dónde atacar algo |
| **Backend** | Endpoints, base de datos, servicios del servidor, migraciones |
| **Mobile** | Pantallas, componentes, navegación, formularios |
| **QA** | Tests, casos edge, revisar código antes del merge |
| **DevOps** | CI/CD, deploy, variables de entorno en producción |

---

## Cómo implementar un feature — el flujo completo

Los agentes se usan **uno por uno, en secuencia**. Nunca los 4 juntos en la misma sesión.

```
Backend → Mobile → QA
```

El Mobile necesita que el Backend ya exista para conectarse a él.
El QA necesita que ambos estén listos para poder probarlos.

### Paso a paso

**1. Decides qué quieres construir**

Ejemplo: *implementar el registro de medicamentos.*

**2. ¿Arranco con el CTO o directo al Backend?**

- Si la tarea es concreta y sabes cómo hacerla → **ve directo al Backend**
- Si no sabes cuál es la mejor forma técnica de resolverlo → **primero el CTO**

Regla fácil: si puedes escribir la tarea con claridad, ve directo. Si no sabes ni cómo describirla, primero pasa por el CTO.

**3. Abre Claude Code en la raíz del repo**

Claude Code leerá `CLAUDE.md` automáticamente. Ya tiene el contexto del proyecto.

**4. Ve a `AGENTS.md`, copia el prompt del agente que necesitas**

Solo cambia la sección al final que dice `Tarea de esta sesión`. Sé lo más específico posible.

**5. Avanza sesión por sesión**

Cuando el Backend termina y funciona, cierras esa sesión. Abres una nueva para el Mobile. Luego otra para QA.

---

## Ejemplo real — Registro de Medicamentos

### Sesión 1 — Backend
```
[prompt del Backend agent de AGENTS.md]

Tarea de esta sesión:
Implementa el CRUD completo de medicamentos: POST /api/medications,
GET /api/medications, PATCH /api/medications/:id, DELETE /api/medications/:id.
Incluye validación Zod y broadcast realtime al grupo familiar al finalizar.
```
Revisas que funcione → cierras la sesión.

### Sesión 2 — Mobile
```
[prompt del Mobile agent de AGENTS.md]

Tarea de esta sesión:
Crea la pantalla MedicationsScreen que lista los medicamentos activos con
nombre, dosis y horarios del día. Incluye botón para agregar uno nuevo y
el formulario AddMedicationScreen. Conéctala al endpoint /api/medications.
```
Revisas que funcione → cierras la sesión.

### Sesión 3 — QA
```
[prompt del QA agent de AGENTS.md]

Tarea de esta sesión:
Revisa medications.controller.ts y MedicationsScreen. Escribe los tests
para los casos críticos y dime qué casos edge no estamos manejando.
```
Tests pasan → `git commit` → feature listo.

---

## Regla de oro

> **Una sesión = un agente = una tarea específica.**
>
> Cuanto más concreto seas en "Tarea de esta sesión", mejor código genera el agente.

---

## Stack del proyecto

| Área | Tecnología |
|------|-----------|
| Mobile | React Native + Expo (TypeScript) |
| Backend | Node.js + Express (TypeScript) |
| Base de datos | PostgreSQL via Supabase + Prisma |
| Auth | Supabase Auth (OTP) |
| Realtime | Supabase Realtime |
| Emails | Resend + react-email |
| Estado | Zustand + React Query |
| Estilos | NativeWind (Tailwind) |
| CI/CD | GitHub Actions |

## Features del MVP

1. Auth + grupo familiar con roles
2. Checklist de actividades de cuidado
3. Registro de medicamentos y horarios
4. Calendario de citas médicas
5. Asignación de responsabilidades
6. Gastos compartidos
7. Notas médicas y de turno

---

## Setup inicial

```bash
# Clonar el repo
git clone https://github.com/tu-usuario/ayni-care.git
cd ayni-care

# Instalar dependencias
npm install

# Copiar variables de entorno
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
# → Llenar con tus credenciales de Supabase y Resend

# Correr la BD
cd apps/backend
npx prisma migrate dev
npx prisma db seed

# Levantar backend
npm run dev

# Levantar mobile (en otra terminal)
cd apps/mobile
npx expo start
```
