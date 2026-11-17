# Yuyay — Puesta en marcha

Guía para dejar Yuyay funcionando con familias reales: plantillas de WhatsApp, configuración de Vapi, variables de entorno y cómo inscribir a un paciente.

---

## 1. Plantillas de WhatsApp (enviar a Meta primero: la aprobación tarda 1–2 días)

Meta solo deja enviar texto libre si la familia nos escribió en las últimas 24 horas. El reporte nocturno, las alertas y la bienvenida **necesitan plantillas aprobadas**.

**Dónde:** Meta Business Suite → WhatsApp Manager → Plantillas de mensajes → Crear plantilla.

- **Categoría:** Utilidad (si Meta la reclasifica como Marketing, revisar el texto y volver a enviarla).
- **Idioma:** Español (`es`).
- **Nombre:** exactamente el indicado. Si Meta obliga a usar otro nombre, se configura con la variable de entorno indicada.
- Copiar el cuerpo tal cual. Las variables `{{1}}`, `{{2}}`… las rellena el backend en ese orden.

### `yuyay_alerta` (variable: `YUYAY_WA_TPL_ALERT`)

```
🚨 Alerta Yuyay

Hola {{1}}, en la llamada de acompañamiento con {{2}} detectamos algo que requiere tu atención.

Motivo: {{3}}
Lo que mencionó: {{4}}

Comunícate con tu familiar lo antes posible. Si no contesta o los síntomas son fuertes, llama al SAMU (106).

Yuyay es un servicio preventivo y no reemplaza la atención de emergencias.
```

Ejemplos para Meta: `{{1}}` María · `{{2}}` Don Carlos · `{{3}}` Dolor fuerte en el pecho y mareo · `{{4}}` Me siento mal, me aprieta el pecho...

### `yuyay_reporte_nocturno` (variable: `YUYAY_WA_TPL_NIGHTLY`)

```
🌿 Reporte Yuyay de {{1}}
📅 {{2}}

💊 Medicamentos: {{3}}
😊 Ánimo: {{4}}
🩺 Bienestar físico: {{5}}
📞 Llamadas contestadas hoy: {{6}}
📊 Adherencia de los últimos 7 días: {{7}}

Yuyay: cuidando a quienes cuidaron de ti.
```

Ejemplos: `{{1}}` Don Carlos · `{{2}}` martes, 17 de noviembre · `{{3}}` ✅ Losartán (08:31 a. m.), ⚠️ Metformina: se le acabó (08:31 a. m.) · `{{4}}` Tranquilo y de buen ánimo · `{{5}}` Dolor leve en la cintura · `{{6}}` 1 · `{{7}}` 86%

### `yuyay_bienvenida` (variable: `YUYAY_WA_TPL_WELCOME`)

```
🌿 ¡Bienvenido a Yuyay, {{1}}!

Registramos a {{2}} para el acompañamiento telefónico. Antes de la primera llamada lo llamaremos para explicarle el servicio y pedirle su consentimiento.

Recibirás las alertas y el reporte de cada noche en este chat.
```

### `yuyay_consentimiento_ok` (variable: `YUYAY_WA_TPL_CONSENT_OK`)

```
✅ Hola {{1}}, completamos la llamada de inducción con {{2}} y aceptó el acompañamiento telefónico.

Desde mañana recibirá sus llamadas a las {{3}}. Te enviaremos el reporte cada noche por este chat.
```

### `yuyay_consentimiento_no` (variable: `YUYAY_WA_TPL_CONSENT_NO`)

```
Hola {{1}}, llamamos a {{2}} para explicarle el servicio, pero no aceptó recibir las llamadas ({{3}}).

Las llamadas quedan en pausa. Escríbenos si quieres coordinar una nueva llamada.
```

Cuando las 5 estén **aprobadas**, poner `YUYAY_WA_USE_TEMPLATES=true` en el servidor. Mientras sea `false`, se envía texto libre (sirve para pruebas con el número sandbox de Meta).

---

## 2. Vapi

En el asistente de Yuyay en Vapi:

1. **Server URL:** `https://<dominio-del-backend>/api/yuyay/voice-webhook`
2. **Server URL Secret:** el mismo valor que `VAPI_WEBHOOK_SECRET`. Sin esto el backend responde 401.
3. **Prompt del asistente:** puede usar estas variables, que el backend envía en cada llamada:
   - `{{seniorName}}`, `{{timeSlot}}` (mañana/tarde/noche), `{{isInduction}}`
   - `{{medications}}` (ej. "Losartán 50mg (1 tableta con el desayuno); Metformina 850mg")
   - `{{conditions}}`, `{{lastMood}}`
   - No borrar `{{elderlyId}}` ni `{{scheduledCallId}}` de las variables: el webhook las usa para saber de quién es la llamada.
4. **Número de salida a Perú (+51):** los números de Vapi son de EE. UU. Habilitar llamadas internacionales o importar un número propio (Twilio/SIP) y poner su id en `VAPI_PHONE_NUMBER_ID`.

---

## 3. Variables de entorno del servidor

Además de las de Ayni Care (`DATABASE_URL`, `GEMINI_API_KEY`, `META_WA_*`…):

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `YUYAY_ADMIN_TOKEN` | Token largo y aleatorio (endpoints internos) |
| `YUYAY_CRON_SECRET` | Otro token (solo si se usa cron externo) |
| `VAPI_WEBHOOK_SECRET` | Igual al "Server URL Secret" de Vapi |
| `YUYAY_VOICE_PROVIDER` | `vapi` |
| `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID` | De Vapi |
| `YUYAY_WA_USE_TEMPLATES` | `true` cuando las plantillas estén aprobadas |
| `YUYAY_SCHEDULER_ENABLED` | `true` (una sola instancia del servidor) |

Para generar tokens: `openssl rand -hex 32`

**Servidor:** debe estar siempre encendido y con **una sola instancia** (Railway sirve; el plan gratis de Render se duerme y Vercel no corre el scheduler).

---

## 4. Inscribir a una familia

Todos los endpoints internos llevan la cabecera `Authorization: Bearer <YUYAY_ADMIN_TOKEN>`.

### Desde un lead de la landing

```bash
curl -X POST https://<backend>/api/yuyay/enroll \
  -H "Authorization: Bearer $YUYAY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "<id del lead>",
    "conditions": ["Hipertensión", "Diabetes tipo 2"],
    "medications": [
      { "name": "Losartán", "dosage": "50mg", "instructions": "1 tableta con el desayuno" },
      { "name": "Metformina", "dosage": "850mg", "instructions": "1 tableta con el desayuno" }
    ],
    "preferredCallTimes": ["08:30"]
  }'
```

### Sin lead (datos directos)

Igual, pero en vez de `leadId` enviar `childName`, `childPhone`, `seniorName` y `seniorPhone`.

### Qué pasa después

1. Se crean la familia, el cuidador, el adulto mayor, sus medicamentos y la agenda de llamadas.
2. Se llama de inmediato al adulto mayor (**llamada de inducción**) para explicarle el servicio y pedirle su consentimiento. Para no llamar todavía: `"startInduction": false`.
3. Si **acepta**: queda registrado el consentimiento, el hijo recibe un WhatsApp y las llamadas diarias empiezan solas.
4. Si **no contesta** la inducción, no hay reintento automático. Volver a llamar:

```bash
curl -X POST https://<backend>/api/yuyay/trigger-call \
  -H "Authorization: Bearer $YUYAY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "elderlyId": "<id>", "isInduction": true }'
```

### Cambiar horarios (1 a 3 llamadas al día)

```bash
curl -X PATCH https://<backend>/api/yuyay/preferences/<elderlyId> \
  -H "Authorization: Bearer $YUYAY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "preferredCallTimes": ["08:30", "20:00"] }'
```
