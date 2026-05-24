# Ayni Care — Contexto del Proyecto

## ¿Qué es Ayni Care?
App móvil de coordinación de cuidado para familias latinoamericanas que cuidan a un adulto mayor dependiente en casa. Reemplaza el caos de WhatsApp + papel + llamadas con un sistema compartido donde toda la red familiar opera con la misma información en tiempo real.

## Equipo
Proyecto de 1-2 personas. Priorizar velocidad de desarrollo y simplicidad sobre over-engineering.

## Stack
- **Mobile:** React Native + Expo (TypeScript)
- **Backend:** Node.js + Express + TypeScript
- **BD:** PostgreSQL via Supabase + Prisma ORM
- **Auth:** Supabase Auth (OTP por teléfono o email)
- **Realtime:** Supabase Realtime
- **Emails:** Resend + react-email
- **Estado:** Zustand + React Query (@tanstack/react-query)
- **Estilos:** NativeWind (Tailwind para React Native)
- **CI/CD:** GitHub Actions
- **Repo:** Monorepo (npm workspaces)

## Estructura del Monorepo
```
ayni-care/
├── CLAUDE.md               ← este archivo (leído automáticamente por Claude Code)
├── skills/
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   ├── MOBILE.md
│   ├── DATABASE.md
│   └── QA.md
├── apps/
│   ├── mobile/             ← Expo app
│   └── backend/            ← Express API
├── packages/
│   └── shared/             ← tipos TypeScript compartidos
└── package.json
```

## Features del MVP (en orden de prioridad)
1. **Auth + Familia** — registro, login OTP, invitar miembros, roles
2. **Checklist de actividades** — tareas de cuidado diarias, asignar, completar
3. **Registro de medicamentos** — nombre, dosis, horario, recordatorios
4. **Calendario de citas** — médicas y otras, con recordatorio por notificación/email
5. **Asignación de responsabilidades** — quién hace qué, rotación de turnos
6. **Gastos compartidos** — registrar gasto, dividir entre familiares, historial
7. **Notas médicas** — notas de turno/handoff entre cuidadores

## Reglas globales (SIEMPRE seguir)
- TypeScript estricto en todo el proyecto. Nunca usar `any`.
- Respuestas API siempre: `{ success: boolean, data: T | null, error?: string }`
- IDs siempre UUID, nunca exponer IDs numéricos de BD.
- Fechas siempre en UTC en BD, convertir a timezone local en el cliente.
- Todo endpoint requiere autenticación JWT (excepto `/auth/*`).
- Toda escritura emite evento realtime al grupo familiar del usuario.
- Validar inputs con Zod antes de tocar la BD.
- Manejo de errores con try/catch en todo controlador.
- Español como idioma principal de la UI.

## Skills de referencia
Antes de cualquier tarea, leer el skill correspondiente:
- **Arquitectura general:** `skills/ARCHITECTURE.md`
- **Tareas de backend:** `skills/BACKEND.md`
- **Tareas de mobile:** `skills/MOBILE.md`
- **Cambios en BD:** `skills/DATABASE.md`
- **Tests y QA:** `skills/QA.md`
