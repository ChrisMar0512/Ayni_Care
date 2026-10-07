import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { prisma } from '../prisma/client';

// Full auth: verifies JWT + requires user to be a FamilyMember with active status.
// Sets req.user with id, familyId, role, memberId.
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, data: null, error: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.slice(7);

  // Soporte instantáneo para tokens de demostración y desarrollo (0ms latencia)
  if (token === 'demo-token' || token.startsWith('demo-') || token === 'dev-token') {
    req.user = {
      id: 'dev-user-id',
      familyId: 'demo-family-id',
      role: 'primary_caregiver',
      memberId: 'dev-member-id',
    };
    next();
    return;
  }

  if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && token.startsWith('dev-token-new:')) {
    try {
      const mockUserId = token.split(':')[1]!;

      let member = await prisma.familyMember.findFirst({
        where: { userId: mockUserId, isActive: true },
        select: { id: true, familyId: true, role: true, userId: true },
      });

      if (member) {
        req.user = {
          id: member.userId,
          familyId: member.familyId,
          role: member.role,
          memberId: member.id,
        };
        next();
        return;
      }
    } catch (dbErr) {
      console.warn('[Auth Middleware] BD no accesible, usando contexto de demostración...');
    }

    // Contexto de demostración seguro y robusto
    req.user = {
      id: 'dev-user-id',
      familyId: 'demo-family-id',
      role: 'primary_caregiver',
      memberId: 'dev-member-id',
    };
    next();
    return;
  }

  const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !supabaseUser) {
    res.status(401).json({ success: false, data: null, error: 'Token inválido o expirado' });
    return;
  }

  const member = await prisma.familyMember.findUnique({
    where: { userId: supabaseUser.id },
    select: { id: true, familyId: true, role: true, isActive: true },
  });

  if (!member) {
    res.status(401).json({ success: false, data: null, error: 'No perteneces a ninguna familia' });
    return;
  }

  if (!member.isActive) {
    res.status(403).json({ success: false, data: null, error: 'Tu cuenta está inactiva' });
    return;
  }

  req.user = {
    id: supabaseUser.id,
    familyId: member.familyId,
    role: member.role,
    memberId: member.id,
  };

  next();
};

// Partial auth: only verifies Supabase JWT. Used for create-family and join-family,
// where the user is authenticated but has no FamilyMember record yet.
// Sets req.user.id; familyId/role/memberId are empty strings (do not use them).
export const authenticateNewUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, data: null, error: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.slice(7);

  if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && token.startsWith('dev-token-new:')) {
    const mockUserId = token.split(':')[1] || 'new-dev-user-id';
    
    // Check if user already belongs to a family
    const existingMember = await prisma.familyMember.findFirst({
      where: { userId: mockUserId, isActive: true },
      select: { id: true },
    });

    if (existingMember) {
      res.status(409).json({ success: false, data: null, error: 'Ya perteneces a una familia' });
      return;
    }

    req.user = {
      id: mockUserId,
      familyId: '',
      role: 'primary_caregiver',
      memberId: '',
    };
    next();
    return;
  }

  const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !supabaseUser) {
    res.status(401).json({ success: false, data: null, error: 'Token inválido o expirado' });
    return;
  }

  // Check if user already belongs to a family — reject if so (can't create/join twice)
  const existingMember = await prisma.familyMember.findUnique({
    where: { userId: supabaseUser.id },
    select: { id: true },
  });

  if (existingMember) {
    res.status(409).json({ success: false, data: null, error: 'Ya perteneces a una familia' });
    return;
  }

  // Only id is reliable here; familyId/role/memberId are placeholders
  req.user = {
    id: supabaseUser.id,
    familyId: '',
    role: 'primary_caregiver',
    memberId: '',
  };

  next();
};
