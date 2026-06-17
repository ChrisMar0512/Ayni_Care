import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { prisma } from '../prisma/client';
import { VerifyOtpInput } from '../schemas/auth.schema';

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, token, email, phone } = req.validatedBody as VerifyOtpInput;

    let sessionData;
    let error;

    if (type === 'email' && email) {
      // Intentar primero como magiclink (usuario existente)
      console.log('[auth] Intentando verificar OTP como magiclink...');
      const resMagic = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token,
        email,
      });

      if (resMagic.error) {
        console.log('[auth] Falló magiclink:', resMagic.error.message);
        console.log('[auth] Intentando verificar OTP como signup...');
        // Si falla, intentar como signup (usuario nuevo)
        const resSignup = await supabase.auth.verifyOtp({
          type: 'signup',
          token,
          email,
        });
        sessionData = resSignup.data;
        error = resSignup.error;
        if (resSignup.error) {
          console.log('[auth] Falló signup:', resSignup.error.message);
        }
      } else {
        sessionData = resMagic.data;
        error = resMagic.error;
      }
    } else {
      // Para SMS (type === 'sms'), pasamos 'sms'
      const resSms = await supabase.auth.verifyOtp({
        type: 'sms',
        token,
        phone: phone!,
      });
      sessionData = resSms.data;
      error = resSms.error;
    }

    if (error || !sessionData.session || !sessionData.user) {
      console.log('[auth] Error final de verificación OTP:', error?.message);
      res.status(401).json({ success: false, data: null, error: error?.message ?? 'OTP inválido o expirado' });
      return;
    }

    const { user: supabaseUser, session } = sessionData;

    // Return family membership if the user already has one
    let member = await prisma.familyMember.findUnique({
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
        member,
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
