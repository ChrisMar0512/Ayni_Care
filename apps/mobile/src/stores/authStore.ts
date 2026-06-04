import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { MemberRole } from '@ayni-care/shared';

interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
}

interface AuthMember {
  id: string;
  familyId: string;
  role: MemberRole;
  name: string;
  family: { name: string };
}

interface AuthState {
  user: AuthUser | null;
  member: AuthMember | null;
  familyId: string | null;
  role: MemberRole | null;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  setAuth: (user: AuthUser, member: AuthMember | null, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  member: null,
  familyId: null,
  role: null,
  isInitialized: false,

  initialize: async () => {
    try {
      const [token, userRaw, memberRaw] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('auth_user'),
        SecureStore.getItemAsync('auth_member'),
      ]);

      if (token && userRaw) {
        const user: AuthUser = JSON.parse(userRaw);
        const member: AuthMember | null = memberRaw ? JSON.parse(memberRaw) : null;
        set({
          user,
          member,
          familyId: member?.familyId ?? null,
          role: member?.role ?? null,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  setAuth: async (user, member, accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync('access_token', accessToken),
      SecureStore.setItemAsync('refresh_token', refreshToken),
      SecureStore.setItemAsync('auth_user', JSON.stringify(user)),
      SecureStore.setItemAsync('auth_member', member ? JSON.stringify(member) : ''),
    ]);
    set({
      user,
      member,
      familyId: member?.familyId ?? null,
      role: member?.role ?? null,
    });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('refresh_token'),
      SecureStore.deleteItemAsync('auth_user'),
      SecureStore.deleteItemAsync('auth_member'),
    ]);
    set({ user: null, member: null, familyId: null, role: null });
  },
}));
