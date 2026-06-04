import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { prisma } from '../prisma/client';
import { VerifyOtpInput } from '../schemas/auth.schema';

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, token, email, phone } = req.validatedBody as VerifyOtpInput;

    const { data: sessionData, error } = await supabase.auth.verifyOtp({
      type,
      token,
      ...(email ? { email } : { phone: phone! }),
    });

    if (error || !sessionData.session || !sessionData.user) {
      res.status(401).json({ success: false, data: null, error: 'OTP inválido o expirado' });
      return;
    }

    const { user: supabaseUser, session } = sessionData;

    // Return family membership if the user already has one
    const member = await prisma.familyMember.findUnique({
      where: { userId: supabaseUser.id },
      select: {
        id: true,
        familyId: true,
        role: true,
        name: true,
        family: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      data: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          phone: supabaseUser.phone,
        },
        member: member ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user.id;

    // Invalidate all sessions for this user (global scope = all devices)
    await supabaseAdmin.auth.admin.signOut(userId, 'global').catch((err: Error) => {
      console.error('[auth] signOut error:', err.message);
    });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
