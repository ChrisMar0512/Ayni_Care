import { Router } from 'express';

const router = Router();

// HTML Template Helper
function renderLegalPage(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Ayni Care</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #F8F5F0;
      color: #2C2C2C;
      line-height: 1.65;
      padding: 32px 16px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #EAE6DF;
    }
    .header {
      border-bottom: 2px solid #F3EFEA;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 800;
      color: #D4856A;
      text-decoration: none;
      margin-bottom: 12px;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: #D4856A;
      color: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #1A1A1A;
      margin-bottom: 6px;
    }
    .updated {
      font-size: 13px;
      color: #8C8881;
      font-weight: 500;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #2C2C2C;
      margin-top: 32px;
      margin-bottom: 12px;
    }
    p {
      margin-bottom: 16px;
      color: #4A4A4A;
      font-size: 15px;
    }
    ul {
      margin-bottom: 16px;
      padding-left: 24px;
      color: #4A4A4A;
      font-size: 15px;
    }
    li { margin-bottom: 8px; }
    .highlight-box {
      background: #FDF6F3;
      border-left: 4px solid #D4856A;
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin: 24px 0;
    }
    .highlight-box p { margin: 0; color: #8A4E39; font-weight: 500; }
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #EAE6DF;
      text-align: center;
      font-size: 13px;
      color: #8C8881;
    }
    .footer a { color: #D4856A; text-decoration: none; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
    .btn {
      display: inline-block;
      background: #D4856A;
      color: #FFFFFF;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 12px;
      border: none;
      cursor: pointer;
      font-size: 15px;
    }
    .btn:hover { background: #B96B52; }
    .input-field {
      width: 100%;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #D1D5DB;
      font-size: 15px;
      margin-top: 8px;
      margin-bottom: 16px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <span class="brand-icon">🌱</span> Ayni Care
      </div>
      <h1>${title}</h1>
      <div class="updated">Última actualización: 12 de Octubre de 2026</div>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>© 2026 Ayni Care — Coordinación y cuidado familiar inteligente.</p>
      <p style="margin-top: 6px;">
        <a href="/privacy-policy">Política de Privacidad</a> • 
        <a href="/terminos">Términos de Servicio</a> • 
        <a href="/delete-account">Eliminación de Cuenta</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── GET /privacy-policy ───────────────────────────────────────────────────────
router.get(['/privacy-policy', '/politica-de-privacidad'], (_req, res) => {
  const content = `
    <div class="highlight-box">
      <p>En Ayni Care nos tomamos la privacidad de tu familia y la salud de tus seres queridos con la máxima seriedad y rigor ético.</p>
    </div>

    <h2>1. Información que recopilamos</h2>
    <p>Para brindarte el servicio de coordinación de cuidado, recopilamos las siguientes categorías de datos personales:</p>
    <ul>
      <li><strong>Información de cuenta:</strong> Nombre, dirección de correo electrónico, número de teléfono y fotografía de perfil opcional provista por ti o por proveedores OAuth (Google, Apple).</li>
      <li><strong>Datos de cuidado y salud del adulto mayor:</strong> Nombre o apodo del familiar cuidado, horarios y dosis de medicamentos, citas médicas con especialistas, alergias y notas de cuidado registradas por la familia.</li>
      <li><strong>Grabaciones y audio:</strong> Si utilizas el asistente de voz, el audio se procesa exclusivamente para transcribir y estructurar la tarea solicitada (por ejemplo, registrar una medicina o cita) y no se comercializa ni se utiliza para publicidad de terceros.</li>
      <li><strong>Gastos y finanzas familiares:</strong> Registros de compras de farmacia, consultas o insumos médicos divididos entre los cuidadores.</li>
    </ul>

    <h2>2. Finalidad del tratamiento de datos</h2>
    <p>Utilizamos tu información únicamente para:</p>
    <ul>
      <li>Coordinar la administración puntual de medicamentos y actividades entre los familiares y cuidadores autorizados.</li>
      <li>Enviar recordatorios y notificaciones de dosis, citas médicas y cambios de turno.</li>
      <li>Facilitar la división transparente de gastos familiares de cuidado.</li>
      <li>Permitir que la inteligencia artificial de Ayni te asista mediante dictado por voz y resúmenes diarios.</li>
    </ul>

    <h2>3. Protección y seguridad de los datos</h2>
    <p>Toda la comunicación entre la aplicación móvil y nuestros servidores se realiza mediante cifrado de grado bancario (TLS 1.3 / HTTPS). Los datos se almacenan en centros de datos con certificación ISO 27001 y SOC 2 (Supabase / PostgreSQL) con políticas de aislamiento por familia (RBAC).</p>

    <h2>4. Derechos del usuario (Acceso, Rectificación y Cancelación)</h2>
    <p>Como usuario, tienes derecho pleno a:</p>
    <ul>
      <li>Acceder y exportar en cualquier momento los registros de cuidado y gastos de tu familia.</li>
      <li>Corregir cualquier dato erróneo directamente desde la aplicación.</li>
      <li><strong>Eliminar tu cuenta y todos tus datos personales:</strong> Puedes hacerlo en cualquier instante directamente desde la app en <em>Familia ➔ Eliminar mi cuenta</em>, o a través de nuestra página web pública de <a href="/delete-account">solicitud de eliminación</a>.</li>
    </ul>

    <h2>5. Contacto</h2>
    <p>Si tienes preguntas sobre nuestra política de privacidad o el tratamiento de tus datos, puedes escribir a nuestro Oficial de Privacidad a:</p>
    <p><strong>Correo electrónico:</strong> <a href="mailto:privacidad@aynicare.com" style="color:#D4856A;">privacidad@aynicare.com</a></p>
  `;

  res.send(renderLegalPage('Política de Privacidad', content));
});

// ── GET /terminos ─────────────────────────────────────────────────────────────
router.get(['/terminos', '/terms'], (_req, res) => {
  const content = `
    <h2>1. Aceptación de los Términos</h2>
    <p>Al descargar, instalar o utilizar la aplicación móvil o plataforma Ayni Care, aceptas quedar vinculado por estos Términos y Condiciones de Uso.</p>

    <h2>2. Propósito de la Aplicación y Aviso Médico</h2>
    <div class="highlight-box">
      <p><strong>Aviso importante:</strong> Ayni Care es una herramienta tecnológica de coordinación, registro y comunicación para cuidadores y familiares. Ayni Care NO proporciona diagnósticos médicos, prescripciones ni asesoramiento médico profesional. Siempre consulta a un médico o profesional de la salud colegiado ante cualquier duda de salud o cambio de medicación.</p>
    </div>

    <h2>3. Cuentas y Seguridad</h2>
    <p>Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de las actividades que ocurran bajo tu cuenta o círculo familiar.</p>

    <h2>4. Propiedad Intelectual</h2>
    <p>Todos los derechos sobre la marca, el diseño, el software y los contenidos de Ayni Care corresponden exclusivamente a Ayni Care.</p>

    <h2>5. Cancelación del Servicio</h2>
    <p>Puedes dejar de utilizar el servicio y solicitar el borrado de tu cuenta en cualquier momento sin penalidad alguna.</p>
  `;

  res.send(renderLegalPage('Términos de Servicio', content));
});

// ── GET /delete-account ───────────────────────────────────────────────────────
router.get('/delete-account', (_req, res) => {
  const content = `
    <div class="highlight-box">
      <p>Cumpliendo con las políticas de Google Play Store y Apple App Store, puedes solicitar la eliminación permanente de tu cuenta y todos tus datos asociados en cualquier momento.</p>
    </div>

    <h2>Cómo eliminar tu cuenta</h2>
    <p>Tienes dos formas de realizar esta acción:</p>

    <h3>Opción 1: Directamente desde la App (Inmediato)</h3>
    <p>Abre la app móvil Ayni Care en tu celular, ve a la pestaña <strong>Familia</strong> (o Ajustes), baja hasta la sección <em>Mi Cuenta</em> y pulsa el botón rojo <strong>"Eliminar mi cuenta"</strong>. Al confirmar, tu acceso, membresía y datos personales se desvincularán de forma inmediata.</p>

    <h3 style="margin-top:20px;">Opción 2: Solicitud por formulario web</h3>
    <p>Si ya no tienes acceso a la app o desinstalaste el aplicativo, completa el siguiente formulario para que nuestro equipo procese la eliminación de tus datos en un plazo máximo de 48 horas:</p>

    <form action="/delete-account" method="POST" style="margin-top: 16px; background: #FAF8F5; padding: 24px; border-radius: 14px; border: 1px solid #EAE6DF;">
      <label style="display:block; font-weight:600; font-size:14px; color:#2C2C2C;">Correo electrónico o teléfono registrado en tu cuenta:</label>
      <input type="text" name="identifier" required placeholder="ej. usuario@gmail.com o +51999999999" class="input-field" />

      <label style="display:block; font-weight:600; font-size:14px; color:#2C2C2C;">Motivo de la solicitud (opcional):</label>
      <textarea name="reason" rows="3" placeholder="Cuéntanos brevemente el motivo..." class="input-field" style="resize:vertical;"></textarea>

      <button type="submit" class="btn">Solicitar Eliminación Permanente de Datos</button>
    </form>

    <h2 style="margin-top: 32px;">¿Qué datos se eliminan?</h2>
    <ul>
      <li>Tu perfil de usuario y credenciales de autenticación.</li>
      <li>Tu vinculación como familiar o cuidador en el círculo familiar.</li>
      <li>Tus grabaciones de audio y notas personales.</li>
    </ul>
  `;

  res.send(renderLegalPage('Eliminación de Cuenta y Datos', content));
});

// ── POST /delete-account ──────────────────────────────────────────────────────
router.post('/delete-account', (req, res) => {
  const identifier = req.body?.identifier || 'identificador recibido';
  const content = `
    <div class="highlight-box">
      <p style="color: #2D6A4F;">¡Solicitud recibida correctamente!</p>
    </div>
    <h2>Hemos recibido tu solicitud para: ${identifier}</h2>
    <p>Tu solicitud de eliminación definitiva de cuenta y datos personales ha sido registrada. Nuestro sistema verificará la titularidad y procesará la baja completa en un plazo no mayor a 48 horas laborales.</p>
    <p>Te hemos enviado una confirmación a los datos registrados. Si necesitas asistencia adicional, puedes comunicarte con <a href="mailto:soporte@aynicare.com" style="color:#D4856A;">soporte@aynicare.com</a>.</p>
    <a href="/privacy-policy" class="btn">Volver a la Política de Privacidad</a>
  `;
  res.send(renderLegalPage('Solicitud de Eliminación Enviada', content));
});

export default router;
