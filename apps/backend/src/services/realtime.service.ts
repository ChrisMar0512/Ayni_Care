import { supabaseAdmin } from '../lib/supabase';

export const broadcast = async (familyId: string, event: string, payload: unknown): Promise<void> => {
  try {
    await supabaseAdmin.channel(`family:${familyId}`).send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch {
    // Realtime broadcast is non-blocking — log but don't fail the request
    console.error(`[realtime] broadcast falló para familia ${familyId}:`, event);
  }
};
