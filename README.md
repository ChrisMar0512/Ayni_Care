# Ayni Care — Guías y Contexto para IA

App móvil de coordinación de cuidado para familias latinoamericanas que cuidan a un adulto mayor dependiente en casa. Reemplaza el caos de WhatsApp + papel + llamadas con un sistema compartido donde toda la red familiar opera con la misma información en tiempo real.

---

## 🚀 Ramas de Desarrollo para IA

Este repositorio contiene las guías de arquitectura, convenciones de desarrollo (skills) y configuraciones de agentes optimizadas para diferentes herramientas de Inteligencia Artificial.

Para evitar interferencias entre herramientas y mantener un entorno limpio, **la rama `main` solo contiene esta guía de inicio**. Todo el desarrollo e infraestructura de agentes está dividido en dos ramas principales:

| Rama | IDE / Herramienta | Archivos Clave |
|------|-------------------|----------------|
| **[`antigravity`](https://github.com/ChrisMar0512/Ayni_Care/tree/antigravity)** | Antigravity IDE | `.agent/rules/ayni-care.md` (reglas autodetectadas), `skills/`, `AGENTS.md` |
| **[`claude-code`](https://github.com/ChrisMar0512/Ayni_Care/tree/claude-code)** | Claude Code (CLI) | `CLAUDE.md` (autodetectado por CLI), `skills/`, `AGENTS.md` |

---

## 🛠️ Cómo empezar

Dependiendo del IDE o la herramienta CLI que estés utilizando para desarrollar, debes cambiar de rama en tu entorno local:

### Opción A: Si usas Antigravity IDE
1. Cambia a la rama `antigravity`:
   ```bash
   git checkout antigravity
   git pull origin antigravity
   ```
2. Abre la raíz del proyecto en **Antigravity IDE**.
3. El IDE cargará automáticamente las reglas desde `.agent/rules/ayni-care.md` y tendrás acceso a todos los archivos en `skills/`.

### Opción B: Si usas Claude Code
1. Cambia a la rama `claude-code`:
   ```bash
   git checkout claude-code
   git pull origin claude-code
   ```
2. Ejecuta `claude` en la raíz del proyecto.
3. Claude Code detectará y leerá automáticamente el archivo `CLAUDE.md`.

---

## 📂 Estructura de las Ramas de IA

Cuando estés en la rama `antigravity` o `claude-code`, tendrás acceso a la siguiente estructura:

```
ayni-care/
├── .agent/rules/ayni-care.md  ← [Solo en antigravity] Reglas automáticas para el IDE
├── CLAUDE.md                  ← [Solo en claude-code] Configuración para Claude Code
├── AGENTS.md                  ← Prompts de los agentes (CTO, Backend, Mobile, QA, DevOps)
└── skills/                    ← Guías de desarrollo y convenciones del monorepo
    ├── ARCHITECTURE.md        ← Diseño del sistema y matriz de permisos RBAC
    ├── BACKEND.md             ← Convenciones y estándares de la API REST (Express)
    ├── MOBILE.md              ← Estándares de la App Mobile (React Native + Expo)
    ├── DATABASE.md            ← Esquema de base de datos y soft delete (Prisma)
    ├── SECURITY.md            ← Reglas de autenticación, rate limiting y sanitización
    ├── QA.md                  ← Patrones de testing y criterios de aceptación
    └── DEVOPS.md              ← Flujo de git, CI/CD y despliegue (Railway/EAS)
```
