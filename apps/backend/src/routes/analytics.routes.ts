import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../prisma/client';

const router = Router();

router.post('/commercial-intent', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { intentType, metadata = {} } = req.body;
    const user = req.user;

    if (!intentType || !['pharma_refill', 'caregiver_agency'].includes(intentType)) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'Tipo de intención inválido (se esperaba pharma_refill o caregiver_agency)',
      });
      return;
    }

    const isPharma = intentType === 'pharma_refill';
    const medName = metadata.medicationName || 'Medicamentos crónicos';
    const shiftType = metadata.shiftType || 'Cuidado formal';
    const urgency = metadata.urgency || 'normal';

    const painPointSummary = isPharma
      ? `Solicitó reposición a domicilio: ${medName}`
      : `Solicitó agencia de cuidadores: ${shiftType} (${urgency})`;

    const messageSnippet = isPharma
      ? `El usuario solicitó cotización de entrega mensual programada para ${medName} con boticas aliadas.`
      : `El usuario solicitó cotización formal con agencias de cuidadores para ${shiftType} (Urgencia: ${urgency}).`;

    // 1. Registrar evento de telemetría
    const event = await prisma.analyticsEvent.create({
      data: {
        familyId: user?.familyId || null,
        memberId: user?.memberId || null,
        eventType: 'action_executed',
        channel: 'mobile_app',
        metadata: {
          intentType,
          ...metadata,
          recordedAt: new Date().toISOString(),
        },
      },
    }).catch(() => null);

    // 2. Registrar insight comercial para los paneles de administración
    const insight = await prisma.conversationInsight.create({
      data: {
        familyId: user?.familyId || null,
        memberId: user?.memberId || null,
        senderRole: user?.role || 'primary_caregiver',
        messageSnippet,
        category: isPharma ? 'medication' : 'caregiver_friction',
        sentiment: urgency === 'urgent_week' ? 'stressed' : 'calm',
        urgencyLevel: urgency === 'urgent_week' ? 'critical' : 'high',
        painPointSummary,
        isUnmetNeed: true,
        commercialIntent: isPharma ? 'pharma_subscription' : 'caregiver_hire',
        entitiesDetected: {
          meds: isPharma && metadata.medicationName ? [metadata.medicationName] : [],
          shiftType: !isPharma ? shiftType : null,
          urgency,
        },
      },
    }).catch(() => null);

    console.log(`[Analytics Intent] 🎯 Intención comercial registrada: [${intentType}] ${painPointSummary}`);

    res.json({
      success: true,
      data: {
        recorded: true,
        intentType,
        eventId: event?.id,
        insightId: insight?.id,
      },
    });
  } catch (error: any) {
    console.error('[Analytics Intent] Error registrando intención:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Error interno registrando intención comercial',
    });
  }
});

export default router;
