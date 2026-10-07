import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import type { WebSocketLikeConstructor } from '@supabase/realtime-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qcptaktwzonztmklewgq.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key-for-resilience';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'dummy-anon-key-for-resilience';

// Node 20 no tiene WebSocket nativo — se pasa ws como transport.
// Doble cast necesario: ws@8 y WebSocketLikeConstructor difieren en tipos de onerror/constructor.
const realtimeOptions = { transport: ws as unknown as WebSocketLikeConstructor };

// Admin client — uses SERVICE_ROLE_KEY, bypasses RLS. NUNCA exponer al cliente.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: realtimeOptions,
});

// Anon client — para operaciones de auth que requieren perspectiva del usuario y realtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: realtimeOptions,
});
