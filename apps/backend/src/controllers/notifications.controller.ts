import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { RegisterPushTokenInput } from '../schemas/notification.schema';

/**
 * Registra o actualiza el token de notificaciones push de un miembro.
 */
export const registerPushToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.validatedBody as RegisterPushTokenInput;
    const userId = req.user.id;

    // Registrar o actualizar el token asociándolo al userId del usuario actual
    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { token, userId },
    });

    res.status(200).json({
      success: true,
      data: pushToken,
    });
  } catch (err) {
    next(err);
  }
};
