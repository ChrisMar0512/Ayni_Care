# Ayni_Care
Ayni Care Repositorio

USO CORRECTO: 

El flujo es siempre el mismo, 4 pasos:

**1. Decides qué quieres construir**
Por ejemplo: *"quiero implementar el registro de medicamentos"*

**2. Identificas qué agente necesitas**
- ¿Toca base de datos o endpoints? → **Backend**
- ¿Toca pantallas o componentes? → **Mobile**
- ¿Es una decisión técnica difícil? → **CTO**
- ¿Quieres revisar que esté bien hecho? → **QA**

**3. Abres Claude Code en tu repo y pegas el prompt**
Vas a `AGENTS.md`, copias el prompt del agente que elegiste, y solo cambias la última parte:

```
Tarea de esta sesión:
Implementa el endpoint POST /api/medications para crear un medicamento 
nuevo con nombre, dosis, horario y fecha de inicio.
```

**4. El agente ejecuta con todo el contexto**
Claude Code ya leyó `CLAUDE.md` automáticamente, el agente conoce tus convenciones, tu stack, tu estructura de carpetas. Genera código que encaja directo en tu proyecto.

---

**Un feature completo siempre sigue este orden:**

```
CTO (si hay duda técnica) → Backend → Mobile → QA
```

Para medicamentos sería:
- **Backend** → crea el endpoint y la migración
- **Mobile** → crea la pantalla y el formulario
- **QA** → revisa los casos edge y escribe los tests

---

La regla de oro: **una sesión, un agente, una tarea específica.** Cuanto más concreto seas en "Tarea de esta sesión", mejor código genera.
