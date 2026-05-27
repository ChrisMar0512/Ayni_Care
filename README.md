# Ayni Care

App móvil de coordinación de cuidado para familias latinoamericanas que cuidan a un adulto mayor dependiente en casa. Reemplaza el caos de WhatsApp + papel + llamadas con un sistema compartido donde toda la red familiar opera con la misma información en tiempo real.

---

## Antes de empezar — lee esto

Este proyecto usa un sistema de **skills** y **agentes** para trabajar con IA (Claude Code / Antigravity) de forma ordenada y eficiente. Todo el equipo debe seguir este flujo para mantener consistencia en el código.

| Herramienta | Cómo funciona |
|-------------|---------------|
| **Claude Code** | Lee `CLAUDE.md` automáticamente al abrir el proyecto. Pegas el prompt del agente. |
| **Antigravity** | Lee `.agent/rules/ayni-care.md` automáticamente al abrir el proyecto. Pegas el prompt del agente. |

> ⚠️ **Branches**: el código generado por **Antigravity** va al branch `antigravity`. El código generado por **Claude Code** va al branch `claude-code`. Ninguno toca `main` directamente.

---

## Estructura de archivos importantes

```
ayni-care/
├── .agent/
│   └── rules/
│       └── ayni-care.md  ← Reglas del proyecto (Antigravity las inyecta automáticamente)
├── CLAUDE.md             ← Contexto global (Claude Code lo autodetecta)
├── AGENTS.md             ← Los prompts listos para cada agente
├── README.md             ← este archivo
└── skills/
    ├── ARCHITECTURE.md   ← visión global del sistema + matriz de permisos RBAC
    ├── BACKEND.md        ← convenciones del servidor
    ├── MOBILE.md         ← convenciones de la app
    ├── DATABASE.md       ← schema de BD y reglas de Prisma
    ├── SECURITY.md       ← autenticación, autorización RBAC, rate limiting
    ├── QA.md             ← patrones de testing
    └── DEVOPS.md         ← branches, CI/CD, deploy
```

---

## ¿Qué son los skills?

Los skills son archivos `.md` que le dan contexto permanente al agente de IA. Contienen el stack, la estructura de carpetas, las convenciones de código y las reglas del proyecto.

**Sin skills:** cada vez que abres una sesión nueva el agente no sabe nada de tu proyecto y genera código genérico que no encaja.

**Con skills:** el agente conoce exactamente cómo está estructurado el proyecto, qué librerías usamos y cuáles son las convenciones. El código generado encaja directo en el repo.

> `CLAUDE.md` es el skill principal. Claude Code lo detecta y lee automáticamente. En Antigravity, se configura como user rule para que se inyecte en cada sesión. Los demás skills en `/skills` se referencian desde los prompts de cada agente.

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

