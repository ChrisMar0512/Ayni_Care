import { Request, Response, NextFunction } from 'express';
import {
  processAssistantChat,
  executeConfirmedAssistantAction,
  parseFormInputWithAI,
} from '../services/ai.service';
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

// POST /api/assistant/transcribe
export const transcribeVoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { audioBase64, audioMimeType } = req.body;

    if (!audioBase64) {
      res.status(400).json({ success: false, data: null, error: 'audioBase64 es requerido' });
      return;
    }

    const { transcribeAudio } = await import('../services/ai.service');
    const text = await transcribeAudio(audioBase64, audioMimeType);

    res.json({
      success: true,
      data: { text },
    });
  } catch (err: any) {
    console.error('[Assistant] Error al transcribir voz:', err);
    next(err);
  }
};

// POST /api/assistant/confirm-action
export const confirmAssistantAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: userId, familyId, memberId, role } = req.user;
    const { actionType, draftPayload } = req.body;

    if (!actionType || !draftPayload) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'actionType y draftPayload son obligatorios.',
      });
      return;
    }

    const result = await executeConfirmedAssistantAction(
      { userId, familyId, memberId, role },
      actionType,
      draftPayload
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Assistant] Error al confirmar acción:', err);
    next(err);
  }
};

// POST /api/assistant/parse-form
export const parseFormWithAI = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'El texto es obligatorio para autocompletar.',
      });
      return;
    }

    if (type !== 'medication' && type !== 'activity') {
      res.status(400).json({
        success: false,
        data: null,
        error: "El tipo debe ser 'medication' o 'activity'.",
      });
      return;
    }

    const parsedData = await parseFormInputWithAI(type, text);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    console.error('[Assistant] Error al analizar formulario con IA:', err);
    next(err);
  }
};

