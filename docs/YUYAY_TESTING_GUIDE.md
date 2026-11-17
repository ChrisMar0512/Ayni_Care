# 🌿 Guía de Testeo y Validación — Yuyay Teleasistencia

Esta guía detalla paso a paso cómo probar el flujo de teleasistencia por voz de Yuyay, desde la simulación inmediata hasta la llamada real a un teléfono celular peruano (+51) con voz humana e IA.

---

## 1. Estado Actual del Sistema

El backend en `apps/backend` ya cuenta con:
- **Base de Datos en Supabase:** Modelos `ScheduledCall`, `CallLog`, `YuyayLead` y campos en `ElderlyPerson` sincronizados y activos.
- **Motor Clínico con Gemini Flash:** Extracción de medicamentos confirmados, ánimo, síntomas y banderas rojas médicas.
- **Protocolo de Reintentos:** Reintentos automáticos a los 15 y 30 min ante llamadas no contestadas, y alerta roja al 3er intento fallido.
- **Consentimiento Informado (Ley 29733):** Registro de consentimiento verbal en llamada de inducción.
- **Scheduler Automático:** Cron en hora de Lima (`America/Lima`) que corre llamadas de 8:00 AM / 8:00 PM y el **reporte consolidado de las 20:30 hrs** por WhatsApp.

---

## 2. Método 1: Prueba Inmediata por API (Sin costo ni cuentas externas)

Permite verificar en menos de 10 segundos cómo el backend procesa transcripciones, extrae datos clínicos con Gemini Flash y genera las alertas de WhatsApp.

### A. Iniciar el servidor backend
```powershell
Set-Location "apps\backend"
npm run dev
```

### B. Probar Escenario Rutinario (Toma normal de medicamentos)
Abre otra terminal o usa Postman / cURL:
```powershell
curl -X POST http://localhost:3000/api/yuyay/test-scenario `
  -H "Content-Type: application/json" `
  -d '{"scenario":"routine_success"}'
```
* **Resultado esperado:** Retorna JSON con `medsConfirmed: [{ name: "Losartán", taken: true }, { name: "Metformina", taken: true }]`, `mood: "Tranquilo"`, `hasRedFlag: false`.

### C. Probar Escenario de Emergencia (Bandera Roja Médica)
```powershell
curl -X POST http://localhost:3000/api/yuyay/test-scenario `
  -H "Content-Type: application/json" `
  -d '{"scenario":"red_flag_alert","childPhone":"51999999999","childName":"Christian","seniorName":"Don Carlos"}'
```
* **Resultado esperado:** Retorna `hasRedFlag: true`, `redFlagReason: "Dolor precordial intenso y mareo repentino"` y dispara la notificación de emergencia por WhatsApp recomendando contactar al SAMU (106).

### D. Probar Consentimiento de Inducción (Ley 29733)
```powershell
curl -X POST http://localhost:3000/api/yuyay/test-scenario `
  -H "Content-Type: application/json" `
  -d '{"scenario":"induction"}'
```
* **Resultado esperado:** Retorna `consentGranted: true` y confirma la activación del servicio.

---

## 3. Método 2: Prueba con Llamada de Voz Real a tu Celular (Vapi AI)

Esta es la prueba donde **tu celular físico va a timbrar**, contestarás y hablarás con la voz de IA.

### Paso 1: Crear cuenta en Vapi
1. Entra a [https://vapi.ai](https://vapi.ai) y regístrate con tu correo o Google.
2. Te otorgarán automáticamente **$10 USD de saldo de bienvenida gratis** (suficiente para más de 50 llamadas de prueba).

### Paso 2: Crear el Asistente de Yuyay en Vapi
1. En el menú izquierdo, haz clic en **Assistents** ➡️ **Create Assistant**.
2. Asígnale el nombre: `Yuyay - Teleasistencia`.
3. Configura los módulos:
   - **Transcriber (STT):** `Deepgram`, Language: `Spanish (es)`.
   - **Model (LLM):** `gemini-2.0-flash` o `gpt-4o-mini`.
   - **Voice (TTS):** `Cartesia`, Voice: `Spanish Female Warm` (o similar con tono cálido y empático).
   - **First Message (Saludo inicial):**
     > *"¡Buenos días, don Carlos! Le saluda Yuyay, ¿cómo amaneció hoy? Le llamo para recordarle su pastilla de Losartán para la presión y su Metformina. ¿Ya las tiene a la mano?"*
   - **System Prompt:**
     ```markdown
     Eres Yuyay, una asistente de teleasistencia preventiva y acompañamiento telefónico para adultos mayores en Perú.
     Tu tono es extremadamente cálido, respetuoso, empático y paciente. Hablas en español latinoamericano natural.
     
     Tus objetivos en la llamada:
     1. Saludar con amabilidad y preguntar cómo se siente hoy el adulto mayor.
     2. Recordarle con cariño sus medicamentos programados (ej. Losartán y Metformina) y confirmar si ya los tomó o los tiene a la mano.
     3. Indagar brevemente si ha sentido alguna molestia física (mareo, dolor, malestar).
     4. Si el adulto mayor menciona dolor de pecho, mareos intensos, caídas o visión borrosa, mantén la calma, dile con serenidad que tome asiento de inmediato, que avisarás a su familia y despídete con afecto.
     5. Mantén la llamada breve (2 a 3 minutos). Despídete siempre con calidez deseándole un lindo día.
     ```

### Paso 3: Conectar el Webhook al Backend
Para que cuando la llamada termine, Vapi envíe la grabación y la transcripción a tu backend:
1. Abre tu terminal y expón tu servidor local con `ngrok`:
   ```powershell
   npx ngrok http 3000
   ```
   *(Copia la URL pública generada, ej. `https://abc1234.ngrok-free.app`)*
2. En Vapi, ve a la pestaña **Advanced** del Asistente ➡️ **Server URL**.
3. Pega tu URL apuntando al webhook:
   ```
   https://abc1234.ngrok-free.app/api/yuyay/voice-webhook
   ```

### Paso 4: ¡Hacer la llamada a tu celular!
1. En el dashboard de Vapi, haz clic en **Phone Call** (o botón "Call" arriba a la derecha).
2. Ingresa tu número de celular en formato internacional: `+51 9XXXXXXXX`.
3. Haz clic en **Call**.
4. **¡Tu celular empezará a sonar en 3 segundos!**
5. Atiende la llamada, habla con naturalidad y prueba los 2 escenarios:
   - **Escenario normal:** Dile que ya tomaste las pastillas y que te sientes bien. Cuelga.
   - **Escenario de alerta:** Dile que te duele el pecho y estás mareado. Cuelga.
6. Revisa tu terminal de Node.js y la base de datos de Supabase: verás cómo se analizó la conversación y se generó el log de la llamada.

---

## 4. Criterios de Éxito de la Prueba
- [ ] La llamada timbró en el celular en menos de 5 segundos.
- [ ] La voz sintética suena natural, cálida y sin cortes perceptibles (latencia <500 ms).
- [ ] La IA entendió correctamente la confirmación de las pastillas.
- [ ] El webhook recibió el audio y transcripción en el backend.
- [ ] Gemini extrajo correctamente los datos en JSON en la base de datos de Supabase.
- [ ] En caso de reporte de dolor o molestia, se disparó la alerta de Bandera Roja.

