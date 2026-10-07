import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = (result.error as ZodError).errors[0];
      const field = firstError.path.join('.');
      const message = field ? `${field}: ${firstError.message}` : firstError.message;

      res.status(400).json({
        success: false,
        data: null,
        error: message,
      });
      return;
    }

    req.validatedBody = result.data;
    next();
  };
};
