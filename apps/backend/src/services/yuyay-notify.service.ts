/**
 * Notificaciones de Yuyay por WhatsApp.
 *
 * Meta solo permite texto libre si la persona nos escribió en las últimas 24 horas.
 * Para reportes, alertas y bienvenida hacen falta plantillas aprobadas (ver
 * docs/YUYAY_PLANTILLAS_WHATSAPP.md). Con YUYAY_WA_USE_TEMPLATES=true se envían las
 * plantillas; si no, se envía el texto libre (útil para pruebas y el número sandbox).
 */
import { sendMetaWhatsAppMessage, sendMetaWhatsAppTemplate } from './meta-whatsapp.service';

const useTemplates = (): boolean => process.env.YUYAY_WA_USE_TEMPLATES === 'true';
const templateLanguage = (): string => process.env.YUYAY_WA_TEMPLATE_LANG || 'es';

/** Nombres de plantilla. Se pueden cambiar por variable de entorno si Meta obliga a renombrar. */
export const YUYAY_TEMPLATES = {
  welcome: () => process.env.YUYAY_WA_TPL_WELCOME || 'yuyay_bienvenida',
  alert: () => process.env.YUYAY_WA_TPL_ALERT || 'yuyay_alerta',
  consentOk: () => process.env.YUYAY_WA_TPL_CONSENT_OK || 'yuyay_consentimiento_ok',
  consentNo: () => process.env.YUYAY_WA_TPL_CONSENT_NO || 'yuyay_consentimiento_no',
  nightly: () => process.env.YUYAY_WA_TPL_NIGHTLY || 'yuyay_reporte_nocturno',
};

let warnedFreeText = false;
const warnFreeTextInProduction = () => {
  if (process.env.NODE_ENV === 'production' && !warnedFreeText) {
    warnedFreeText = true;
    console.warn(
      '[Yuyay WhatsApp] Enviando texto libre en producción (YUYAY_WA_USE_TEMPLATES no es "true"). ' +
        'Meta lo rechazará si la familia no escribió en las últimas 24 horas.'
    );
  }
};

const send = async (to: string, templateName: string, params: string[], freeText: string): Promise<void> => {
  if (useTemplates()) {
    await sendMetaWhatsAppTemplate({ to, templateName, languageCode: templateLanguage(), bodyParams: params });
    return;
  }
  warnFreeTextInProduction();
  await sendMetaWhatsAppMessage({ to, text: freeText });
};

// ─── Bienvenida ──────────────────────────────────────────────────────────────

export const notifyWelcome = (p: { to: string; childName: string; seniorName: string }) =>
  send(
    p.to,
    YUYAY_TEMPLATES.welcome(),
    [p.childName, p.seniorName],
    `🌿 *¡Bienvenido a Yuyay, ${p.childName}!* 🌿\n\n` +
      `Registramos a *${p.seniorName}* para el acompañamiento telefónico.\n\n` +
      `📞 Antes de la primera llamada regular lo llamaremos para explicarle el servicio y pedirle su consentimiento.\n\n` +
      `Recibirás las alertas y el reporte de cada noche en este chat.\n\n` +
      `_Equipo Yuyay — Cuidando a quienes más quieres._`
  );

// ─── Alerta (bandera roja o no contesta) ─────────────────────────────────────

export const notifyAlert = (p: {
  to: string;
  childName: string;
  seniorName: string;
  reason: string;
  transcriptSnippet?: string;
}) => {
  const snippet = p.transcriptSnippet ? `${p.transcriptSnippet.slice(0, 140)}...` : 'Sin detalle adicional';
  return send(
    p.to,
    YUYAY_TEMPLATES.alert(),
    [p.childName, p.seniorName, p.reason, snippet],
    `🚨 *ALERTA MÉDICA PREVENTIVA — YUYAY*\n\n` +
      `Hola ${p.childName}, en la llamada de acompañamiento con *${p.seniorName}* detectamos algo que requiere tu atención:\n\n` +
      `⚠️ *Motivo:* ${p.reason}\n` +
      (p.transcriptSnippet ? `💬 *Lo que mencionó:* _"${snippet}"_\n\n` : '\n') +
      `📞 Comunícate con tu familiar lo antes posible. Si no contesta o los síntomas son fuertes, llama al *SAMU (106)*.\n\n` +
      `_(Yuyay es un servicio preventivo y no reemplaza la atención de emergencias)_`
  );
};

// ─── Resultado de la llamada de inducción ────────────────────────────────────

export const notifyConsentResult = (p: {
  to: string;
  childName: string;
  seniorName: string;
  granted: boolean;
  callTimes: string[];
  notes?: string | null;
}) => {
  if (p.granted) {
    const times = p.callTimes.join(' y ') || 'su horario habitual';
    return send(
      p.to,
      YUYAY_TEMPLATES.consentOk(),
      [p.childName, p.seniorName, times],
      `🌿 *¡Consentimiento confirmado — Yuyay!*\n\n` +
        `Hola ${p.childName}, completamos la llamada de inducción con *${p.seniorName}* y aceptó el acompañamiento telefónico.\n\n` +
        `📞 Desde mañana recibirá sus llamadas a las ${times}.\n\n` +
        `_Te enviaremos el reporte cada noche por este chat._`
    );
  }

  const reason = p.notes || 'prefirió no recibir llamadas';
  return send(
    p.to,
    YUYAY_TEMPLATES.consentNo(),
    [p.childName, p.seniorName, reason],
    `⚠️ *Inducción Yuyay*\n\n` +
      `Hola ${p.childName}, llamamos a *${p.seniorName}* para explicarle el servicio, pero no aceptó recibir las llamadas (${reason}).\n\n` +
      `Las llamadas quedan en pausa. Escríbenos si quieres coordinar una nueva llamada.`
  );
};

// ─── Reporte nocturno ────────────────────────────────────────────────────────

export interface NightlyReportData {
  to: string;
  seniorName: string;
  dateLabel: string;
  confirmedMeds: string[];
  missedMeds: string[];
  mood: string;
  symptoms: string;
  answeredCalls: number;
  weeklyAdherence: number | null;
}

export const notifyNightlyReport = (d: NightlyReportData) => {
  const medsLine =
    [...d.confirmedMeds.map((m) => `✅ ${m}`), ...d.missedMeds.map((m) => `⚠️ ${m}`)].join(', ') ||
    'Sin tomas registradas hoy';
  const adherence = d.weeklyAdherence !== null ? `${d.weeklyAdherence}%` : 'sin datos aún';

  const freeText =
    `🌿 *Reporte Nocturno Yuyay — ${d.seniorName}*\n` +
    `📅 _${d.dateLabel}_\n\n` +
    `💊 *Supervisión de Medicamentos:*\n` +
    (d.confirmedMeds.length > 0 ? d.confirmedMeds.map((m) => `✅ ${m}`).join('\n') + '\n' : '• Sin tomas registradas hoy.\n') +
    (d.missedMeds.length > 0 ? '\n*Tomas pendientes/omitidas:*\n' + d.missedMeds.map((m) => `⚠️ ${m}`).join('\n') + '\n' : '') +
    `\n😊 *Estado de ánimo:* ${d.mood}\n` +
    `🩺 *Bienestar físico:* ${d.symptoms}\n` +
    `📞 *Llamadas contestadas hoy:* ${d.answeredCalls}\n` +
    (d.weeklyAdherence !== null ? `📊 *Adherencia de los últimos 7 días:* ${adherence}\n` : '') +
    `\n_Yuyay: Cuidando a quienes cuidaron de ti._`;

  return send(
    d.to,
    YUYAY_TEMPLATES.nightly(),
    [d.seniorName, d.dateLabel, medsLine, d.mood, d.symptoms, String(d.answeredCalls), adherence],
    freeText
  );
};
