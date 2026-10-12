import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { getSupabase } from './supabase';
import api from './api';
import { useAuthStore } from '../stores/authStore';

// Permite cerrar el navegador web al regresar a la aplicación
WebBrowser.maybeCompleteAuthSession();

function parseParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  // Supabase devuelve los tokens en el fragment (#) o en query (?)
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const queryString =
    hashIndex !== -1
      ? url.substring(hashIndex + 1)
      : queryIndex !== -1
      ? url.substring(queryIndex + 1)
      : '';

  if (!queryString) return params;

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

export async function signInWithProvider(provider: 'google' | 'apple'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabase();
    const redirectUrl = makeRedirectUri({
      scheme: 'aynicare',
      path: 'auth/callback',
    });

    console.log(`[OAuth] Iniciando sesión con ${provider}, redirect:`, redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.warn(`[OAuth] Error iniciando con ${provider}:`, error.message);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return {
        success: false,
        error: `No se pudo obtener la URL de autorización de ${provider}.`,
      };
    }

    const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      return { success: false, error: 'Inicio de sesión cancelado.' };
    }

    if (authResult.type === 'success' && authResult.url) {
      const params = parseParamsFromUrl(authResult.url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (!accessToken || !refreshToken) {
        return {
          success: false,
          error: 'No se recibieron credenciales de sesión en la respuesta.',
        };
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionErr || !sessionData.user) {
        return {
          success: false,
          error: sessionErr?.message || 'Error al validar la sesión con Supabase.',
        };
      }

      const supabaseUser = sessionData.user;

      // Sincronizar usuario con el backend para recuperar su familia
      let member = null;
      try {
        const syncRes = await api.post('/api/auth/sync-oauth', {
          userId: supabaseUser.id,
          email: supabaseUser.email,
        });
        if (syncRes.data?.success && syncRes.data?.data?.member) {
          member = syncRes.data.data.member;
        }
      } catch (syncErr) {
        console.warn('[OAuth] Aviso al sincronizar con backend:', syncErr);
      }

      const user = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        phone: supabaseUser.phone,
      };

      await useAuthStore.getState().setAuth(
        user,
        member,
        accessToken,
        refreshToken
      );

      return { success: true };
    }

    return { success: false, error: 'No se completó la autenticación.' };
  } catch (err: any) {
    console.error(`[OAuth Exception] ${provider}:`, err);
    return {
      success: false,
      error: err?.message || `Ocurrió un error al conectar con ${provider}.`,
    };
  }
}
