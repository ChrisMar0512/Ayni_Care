import { Request, Response, NextFunction } from 'express';
import { MemberRole } from '@prisma/client';

type Permission =
  | 'activities:read' | 'activities:create' | 'activities:complete' | 'activities:delete'
  | 'medications:read' | 'medications:create' | 'medications:administer' | 'medications:delete'
  | 'appointments:read' | 'appointments:create' | 'appointments:delete'
  | 'expenses:read' | 'expenses:create' | 'expenses:delete'
  | 'notes:read' | 'notes:create'
  | 'family:invite' | 'family:remove' | 'family:edit_elderly';

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  primary_caregiver: [
    'activities:read', 'activities:create', 'activities:complete', 'activities:delete',
    'medications:read', 'medications:create', 'medications:administer', 'medications:delete',
    'appointments:read', 'appointments:create', 'appointments:delete',
    'expenses:read', 'expenses:create', 'expenses:delete',
    'notes:read', 'notes:create',
    'family:invite', 'family:remove', 'family:edit_elderly',
  ],
  remote_family: [
    'activities:read', 'activities:create',
    'medications:read',
    'appointments:read', 'appointments:create',
    'expenses:read', 'expenses:create',
    'notes:read', 'notes:create',
    'family:edit_elderly',
  ],
  weekend_helper: [
    'activities:read', 'activities:create', 'activities:complete',
    'medications:read', 'medications:administer',
    'appointments:read', 'appointments:create',
    'expenses:read', 'expenses:create',
    'notes:read', 'notes:create',
  ],
  paid_caregiver: [
    'activities:read', 'activities:complete',
    'medications:read', 'medications:administer',
    'appointments:read',
    'notes:read', 'notes:create',
  ],
};

export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { role } = req.user;
    const userPermissions = ROLE_PERMISSIONS[role];
    const hasAll = permissions.every(p => userPermissions.includes(p));

    if (!hasAll) {
      res.status(403).json({
        success: false,
        data: null,
        error: 'No tienes permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
};
