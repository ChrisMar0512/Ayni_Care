import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  console.error('[error]', err.message, err.stack);

  // Prisma known errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code: string };
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ success: false, data: null, error: 'Registro no encontrado' });
      return;
    }
    if (prismaErr.code === 'P2002') {
      res.status(409).json({ success: false, data: null, error: 'Ya existe un registro con esos datos' });
      return;
    }
  }

  res.status(500).json({
    success: false,
    data: null,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
};
