import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { MemberRole } from '@prisma/client';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurado.');
  }
  return new Resend(apiKey);
};

const ROLE_LABELS: Record<MemberRole, string> = {
  primary_caregiver: 'Cuidador/a principal',
  remote_family: 'Familiar remoto/a',
  weekend_helper: 'Ayuda de fin de semana',
  paid_caregiver: 'Cuidador/a pagado/a',
};

export const sendInvitationEmail = async (opts: {
  to: string;
  familyName: string;
  role: MemberRole;
  inviteToken: string;
  expiresAt: Date;
}): Promise<void> => {
  const roleLabel = ROLE_LABELS[opts.role];
  const inviteUrl = `${process.env.APP_URL ?? 'aynicare://'}invite/${opts.inviteToken}`;

  const htmlContent = `
    <div style="font-family: sans-serif; color: #374151; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafaf9;">
      <h2 style="color: #D4856A; margin-top: 0;">Invitación a Ayni Care</h2>
      <p>Has sido invitado/a a unirte a la familia <strong>${opts.familyName}</strong> como <strong>${roleLabel}</strong>.</p>
      
      <p style="margin-top: 20px; margin-bottom: 8px;">Usa el siguiente código de invitación para ingresar desde la aplicación:</p>
      <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 15px; font-weight: bold; text-align: center; color: #1f2937; letter-spacing: 0.5px;">
        ${opts.inviteToken}
      </div>

      <p style="margin-top: 20px;">O si tienes la aplicación instalada en tu dispositivo móvil, puedes pulsar el siguiente enlace:</p>
      <p><a href="${inviteUrl}" style="background-color: #D4856A; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">Aceptar invitación</a></p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-top: 24px; margin-bottom: 12px;" />
      <p style="color: #6b7280; font-size: 12px;">El enlace y código expiran el ${opts.expiresAt.toLocaleDateString('es-PE')}.</p>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail = 
      process.env.SMTP_HOST === 'smtp.gmail.com' || 
      process.env.SMTP_USER.includes('gmail.com') || 
      process.env.SMTP_USER.includes('utec.edu.pe');

    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 5000, // 5s timeout
            socketTimeout: 5000,
          }
        : {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 5000, // 5s timeout
            socketTimeout: 5000,
          }
    );

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: `Te invitaron a cuidar a la familia ${opts.familyName}`,
      html: htmlContent,
    });
  } else {
    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: opts.to,
      subject: `Te invitaron a cuidar a la familia ${opts.familyName}`,
      html: htmlContent,
    });
  }
};
