import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { broadcast } from '../services/realtime.service';
import { sendInvitationEmail } from '../services/email.service';
import { CreateFamilyInput, InviteMemberInput, JoinFamilyInput } from '../schemas/family.schema';
import { MemberRole } from '@prisma/client';
import { demoStore, DEMO_FAMILY_ID } from '../lib/demo-data';

// POST /api/family — crea familia y asigna al usuario como primary_caregiver
export const createFamily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { familyName, memberName, memberPhone, memberEmail, elderlyName } =
      req.validatedBody as CreateFamilyInput;

    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { name: familyName },
      });

      const member = await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId,
          name: memberName,
          phone: memberPhone,
          email: memberEmail,
          role: 'primary_caregiver',
        },
      });

      const elderly = elderlyName
        ? await tx.elderlyPerson.create({
            data: { familyId: family.id, name: elderlyName },
          })
        : null;

      return { family, member, elderly };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// POST /api/family/invite — invita a un nuevo miembro
export const inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { email, phone, role } = req.validatedBody as InviteMemberInput;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const invitation = await prisma.invitation.create({
      data: {
        familyId,
        email,
        phone,
        role: role as MemberRole,
        expiresAt,
      },
      include: { family: { select: { name: true } } },
    });

    if (email) {
      await sendInvitationEmail({
        to: email,
        familyName: invitation.family.name,
        role: invitation.role,
        inviteToken: invitation.token,
        expiresAt,
      }).catch((err: Error) => {
        console.error('[invite] email send failed:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: invitation.id,
        token: invitation.token,
        role: invitation.role,
        email: invitation.email,
        phone: invitation.phone,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/family/join — une al usuario autenticado usando un token de invitación
export const joinFamily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;
    const { token, name, phone, email } = req.validatedBody as JoinFamilyInput;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { family: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      res.status(404).json({ success: false, data: null, error: 'Invitación no encontrada' });
      return;
    }

    if (invitation.usedAt) {
      res.status(409).json({ success: false, data: null, error: 'Esta invitación ya fue usada' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      res.status(410).json({ success: false, data: null, error: 'Esta invitación ha expirado' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.create({
        data: {
          familyId: invitation.familyId,
          userId,
          name,
          phone,
          email,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      });

      return member;
    });

    await broadcast(invitation.familyId, 'family:member_joined', {
      memberId: result.id,
      name: result.name,
      role: result.role,
    });

    res.status(201).json({
      success: true,
      data: {
        memberId: result.id,
        familyId: result.familyId,
        familyName: invitation.family.name,
        role: result.role,
        name: result.name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/family/members — lista todos los miembros activos de la familia
export const listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;

    if (familyId === DEMO_FAMILY_ID) {
      res.json({ success: true, data: demoStore.members });
      return;
    }

    const members = await prisma.familyMember.findMany({
      where: { familyId, isActive: true },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/family/members/:id — desactiva un miembro (soft remove con isActive: false)
export const removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId, memberId: currentMemberId } = req.user;
    const { id } = req.params;

    if (id === currentMemberId) {
      res.status(400).json({ success: false, data: null, error: 'No puedes eliminarte a ti mismo' });
      return;
    }

    const target = await prisma.familyMember.findFirst({
      where: { id, familyId, isActive: true },
      select: { id: true, name: true, role: true },
    });

    if (!target) {
      res.status(404).json({ success: false, data: null, error: 'Miembro no encontrado' });
      return;
    }

    await prisma.familyMember.update({
      where: { id },
      data: { isActive: false },
    });

    await broadcast(familyId, 'family:member_removed', { memberId: id, name: target.name });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
