import { Request, Response, NextFunction } from 'express';
import { processAssistantChat } from '../services/ai.service';
import { ChatAssistantInput } from '../schemas/assistant.schema';

// POST /api/assistant/chat
export const chatWithAssistant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: userId, familyId, memberId, role } = req.user;
    const { message, audioBase64, audioMimeType, history } = req.validatedBody as ChatAssistantInput;

    const result = await processAssistantChat({
      user: {
        userId,
        familyId,
        memberId,
        role,
      },
      message,
      audioBase64,
      audioMimeType,
      history,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Assistant] Error al procesar chat:', err);
    // Si falta la API key o falla el proveedor de IA, retornar mensaje claro
    if (err?.message?.includes('GEMINI_API_KEY')) {
      res.status(500).json({
        success: false,
        data: null,
        error: 'El servicio de IA no está configurado (falta GEMINI_API_KEY).',
      });
      return;
    }

    next(err);
  }
};
