# Ayni Care — Contexto del Proyecto

## ¿Qué es?
App móvil de coordinación de cuidado para familias latinoamericanas que cuidan a un
adulto mayor en casa. Equipo de 1-2 personas. Priorizar simplicidad.

## Stack
- Mobile: React Native + Expo (TypeScript) + NativeWind + Zustand + React Query
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL (Supabase)
- Auth: Supabase Auth (OTP) | Realtime: Supabase Realtime | Emails: Resend
- Repo: Monorepo (npm workspaces) con apps/mobile, apps/backend, packages/shared

## Reglas globales (SIEMPRE seguir)
- TypeScript estricto. Nunca usar `any`.
- Respuestas API: { success: boolean, data: T | null, error?: string }
- IDs siempre UUID. Fechas en UTC en BD, timezone local en cliente.
- Validar inputs con Zod antes de tocar la BD.
- Todo endpoint requiere JWT (excepto /auth/*).
- Toda escritura emite evento realtime al grupo familiar.
- Toda query filtra por familyId del usuario autenticado.
- Español latinoamericano en toda la UI.

## Git
Formato: tipo(dominio): descripción
Tipos: feat | fix | refactor | docs | test | chore
Branches: main → develop → feature/* o fix/*

## Antes de cada tarea
Lee el skill correspondiente en la carpeta skills/ del repo:
- Arquitectura + permisos RBAC: skills/ARCHITECTURE.md
- Backend: skills/BACKEND.md
- Mobile: skills/MOBILE.md
- Base de datos: skills/DATABASE.md
- Seguridad: skills/SECURITY.md
- Testing: skills/QA.md
- DevOps: skills/DEVOPS.md
