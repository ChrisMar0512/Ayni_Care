# 🌿 Ayni Care — Guía de Paneles y Validación Comercial

Este documento consolida el funcionamiento de los paneles de control de **Ayni Care**, qué métricas miden, cómo se captura la información en tiempo real y cómo interpretar los resultados para validar los modelos de negocio.

---

## 🔗 1. Enlaces Oficiales de Acceso

> **Nota:** Ambos paneles son aplicaciones web responsivas (compatibles con móviles y desktop) y cuentan con token de seguridad para el equipo fundador.

* **🎯 Panel de Validación Comercial & Insights:**  
  [https://ayni-care-backend.vercel.app/admin/insights?token=aynicare-admin-2026](https://ayni-care-backend.vercel.app/admin/insights?token=aynicare-admin-2026)
* **⚙️ Panel de Control Operativo Diario:**  
  [https://ayni-care-backend.vercel.app/admin?token=aynicare-admin-2026](https://ayni-care-backend.vercel.app/admin?token=aynicare-admin-2026)
* **📥 Descarga de Datos en CSV (Excel / Sheets):**  
  [https://ayni-care-backend.vercel.app/admin/export-csv?token=aynicare-admin-2026](https://ayni-care-backend.vercel.app/admin/export-csv?token=aynicare-admin-2026)

---

## 🎯 2. Panel de Validación Comercial & Insights (`/admin/insights`)

Diseñado para **fundadores, asesores e inversionistas**. No se enfoca en tareas operativas menores, sino en validar dónde está la demanda y la disposición a pagar.

### A. Indicadores Superiores (Métricas Agregadas en Tiempo Real)
* **Familias Registradas:** Cantidad real de grupos familiares creados en la aplicación.
* **Adultos Mayores Atendidos:** Pacientes geriátricos en seguimiento con diagnóstico y condiciones clínicas.
* **Medicamentos Monitoreados:** Tratamientos crónicos diarios que la app supervisa con horarios y dosis.
* **Gastos Médicos Consolidados:** Suma total en Soles (S/.) de los gastos registrados en la bitácora familiar (farmacia, pañales, suplementos, etc.).

---

### B. Las 3 Secciones Estratégicas

#### 👥 Sección 1: Directorio Dinámico de Familias Registradas
* **Objetivo:** Ver quiénes son los usuarios reales sin depender de casos estáticos o pruebas de desarrollo.
* **Detalle por familia:**
  * Nombre de la familia y fecha de inscripción.
  * Adulto mayor a cargo (edad y condiciones médicas).
  * Composición del equipo de cuidado (cuidador principal, familiares de apoyo y si tienen cuidadora contratada `paid_caregiver`).
  * Listado de medicamentos activos y volumen de gastos reportados en la bitácora.

#### 🎯 Sección 2: Validación Comercial (Farmacia vs. Agencias)
Contiene el **Termómetro de Demanda Real en Vivo (Fake Door Tests)**:
* **📦 Modelo 1: Farmacia Recurrente a Domicilio**
  * *Contador:* Mide cuántas veces los usuarios presionaron *"Pedir reposición a domicilio"* (en alertas de stock bajo ≤ 5 días) o solicitaron cotización desde el banner mensual.
  * *Tesis comercial:* Ticket mensual inelástico recurrente (S/. 120 – S/. 250) con margen neto del 15%–18% mediante alianzas con boticas independientes o cadenas.
* **🛡️ Modelo 2: Agencias de Cuidadores Geriátricos**
  * *Contador:* Mide cuántas familias entraron al módulo de agencias y completaron la cotización formal.
  * *Calificación:* Captura el turno requerido (*noche 12h, día 12h, cama adentro 24/7*) y la urgencia (*urgente esta semana vs evaluando precios*).
  * *Tesis comercial:* Ticket transaccional alto. Fee por colocación (S/. 250 – S/. 350) + cobro mensual SaaS B2B (S/. 35/mes por paciente) para que la agencia supervise a su personal con el rol `paid_caregiver`.

#### 💬 Sección 3: Registro de Dolores e Intenciones Detectadas
* **Objetivo:** Mostrar la evidencia cualitativa de qué problemas tienen las familias.
* **Tabla con:** Fecha, Categoría (`medication`, `caregiver_friction`, `expense`), Resumen del dolor detectado, Nivel de Urgencia (`critical`, `high`, `medium`) e Intención Comercial (`pharma_subscription`, `caregiver_hire`, `family_wallet`).

---

## ⚙️ 3. Panel de Control Operativo Diario (`/admin`)

Diseñado para monitorear el **cumplimiento clínico y la salud del servicio**:
* **Adherencia a Medicamentos (%):** Porcentaje de pastillas tomadas a tiempo vs. dosis omitidas.
* **Cumplimiento de Actividades:** Tareas diarias del adulto mayor (higiene, alimentación, paseos) completadas vs. retrasadas.
* **Signos Vitales:** Historial de presión arterial, glucosa, saturación O2 y temperatura.
* **Distribución de Roles:** Actividad de cuidadores principales, familiares a distancia y cuidadores de apoyo.

---

## 🔬 4. Mecanismo Técnico: ¿Cómo se captura la información?

El sistema no utiliza encuestas hipotéticas; mide **acciones reales** dentro de la app móvil:

```
                  ┌─────────────────────────────────────┐
                  │       Usuario en la App Móvil       │
                  └──────────────────┬──────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
Toca "Pedir reposición"     Pide "Cotización agencia"    Escribe/habla en Chat
(Medicamentos con stock ≤ 5)  (Turno y Urgencia)       (Problemas, quejas, dudas)
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
                   [Backend Express en Vercel]
                 POST /api/analytics/commercial-intent
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
[1. Telemetría Directa]                                 [2. Inteligencia Artificial]
Guarda en 'AnalyticsEvent' la acción                    Gemini analiza mensajes/audios
ejecutada, medicina o turno y metadata.                 y extrae categoría, urgencia y dolor.
         │                                                       │
         └───────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
                 [Base de Datos PostgreSQL en Supabase]
                 Modelos: AnalyticsEvent & ConversationInsight
                                     │
                                     ▼
                 [Paneles Web de Administración]
                 Consultas en vivo sin datos quemados
```

1. **Pruebas de Conversión Activas (Smoke Tests en App):**
   * En `MedicationsScreen.tsx`: Botón en alertas de stock crítico + banner superior de recetas crónicas.
   * En `FamiliaScreen.tsx`: Módulo de agencias de cuidado formal con cuestionario de calificación en 2 preguntas.
2. **Clasificación Automática con IA (Gemini):**
   * En `analytics.service.ts`: Analiza mensajes y notas de voz para detectar si hay familiares desbordados o quejas de dinero entre hermanos.
3. **Consultas Directas:**
   * Las métricas no están cacheadas; cada recarga de la página consulta los totales reales en Supabase.

---

## 🧭 5. Criterio de Decisión: ¿Cómo interpretar los resultados?

| Si el Termómetro muestra... | Interpretación de Mercado | Siguiente Paso de Ejecución |
| :--- | :--- | :--- |
| **Mayor volumen en Farmacia Recurrente** | El dolor prioritario es el abastecimiento continuo y evitar filas. Es un negocio de **alta retención y recurrencia predecible mensual**. | Cerrar convenios comerciales con boticas independientes o cadenas para comisión por recetas automáticas mensuales. |
| **Mayor volumen en Agencias de Cuidadores** | El dolor prioritario es el agotamiento físico del cuidador principal. Es un negocio de **alto ticket y modelo B2B2C**. | Cerrar alianzas con 2 o 3 agencias formales: Ayni Care les deriva clientes calificados (fee S/. 250 – S/. 350) y les cobra S/. 35/mes por paciente por usar la app como software de auditoría y supervisión. |
| **Ambos crecen parejos** | Son modelos complementarios en distintas etapas del paciente. | Integrar la farmacia como base de ingresos mensual recurrente y las agencias como canal de ingresos de alto margen por colocación. |
