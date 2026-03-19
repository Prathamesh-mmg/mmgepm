// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id:          string;      // Guid
  firstName:   string;
  lastName:    string;
  email:       string;
  phone?:      string;
  department?: string;
  jobTitle?:   string;
  avatarUrl?:  string;
  isActive:    boolean;
  roles:       string[];
  permissions: string[];
}

interface AuthState {
  accessToken:   string | null;
  refreshToken:  string | null;
  user:          UserProfile | null;
  isAuth:        boolean;
  setAuth:       (accessToken: string, refreshToken: string, user: UserProfile) => void;
  setUser:       (user: UserProfile) => void;
  clearAuth:     () => void;
  hasRole:       (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin:       () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken:  null,
      refreshToken: null,
      user:         null,
      isAuth:       false,

      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isAuth: true }),

      setUser: (user) => set({ user }),

      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuth: false }),

      hasRole: (role: string) =>
        get().user?.roles?.includes(role) ?? false,

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.roles.includes('Admin')) return true;
        return user.permissions.includes(permission);
      },

      isAdmin: () => get().user?.roles?.includes('Admin') ?? false,
    }),
    {
      name: 'mmg-auth',
      partialize: (state) => ({
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
        isAuth:       state.isAuth,
      }),
    }
  )
);
