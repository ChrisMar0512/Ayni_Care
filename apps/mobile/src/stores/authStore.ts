import { create } from 'zustand';
import { storage } from '../services/storage';
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
        storage.getItem('access_token'),
        storage.getItem('auth_user'),
        storage.getItem('auth_member'),
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
      storage.setItem('access_token', accessToken),
      storage.setItem('refresh_token', refreshToken),
      storage.setItem('auth_user', JSON.stringify(user)),
      storage.setItem('auth_member', member ? JSON.stringify(member) : ''),
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
      storage.deleteItem('access_token'),
      storage.deleteItem('refresh_token'),
      storage.deleteItem('auth_user'),
      storage.deleteItem('auth_member'),
    ]);
    set({ user: null, member: null, familyId: null, role: null });
  },
}));
