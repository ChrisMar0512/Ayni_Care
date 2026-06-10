import { Resend } from 'resend';
import { MemberRole } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: opts.to,
    subject: `Te invitaron a cuidar a la familia ${opts.familyName}`,
    html: `
      <h2>Invitación a Ayni Care</h2>
      <p>Has sido invitado/a a unirte a la familia <strong>${opts.familyName}</strong> como <strong>${roleLabel}</strong>.</p>
      <p><a href="${inviteUrl}">Aceptar invitación</a></p>
      <p>El enlace expira el ${opts.expiresAt.toLocaleDateString('es-PE')}.</p>
    `,
  });
};
