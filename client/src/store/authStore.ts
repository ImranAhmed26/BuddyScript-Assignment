// no zustand persist middleware on purpose. access token is memory-only;
// the httpOnly refresh cookie is what actually survives a page reload
import { create } from 'zustand';
import { api, refreshAccessToken, setAccessToken, setAuthFailureHandler } from '../lib/apiClient';
import type { User } from '../lib/types';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthResponse {
  user: User;
  accessToken: string;
}

interface AuthState {
  user: User | null;
  status: AuthStatus;
  bootstrap: () => Promise<void>; // called once on app load to restore a session from the refresh cookie
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  const clear = () => {
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  };

  setAuthFailureHandler(clear);

  return {
    user: null,
    status: 'loading',

    bootstrap: async () => {
      const token = await refreshAccessToken();
      if (!token) {
        set({ status: 'unauthenticated' });
        return;
      }
      try {
        const { data } = await api.get<{ user: User }>('/auth/me');
        set({ user: data.user, status: 'authenticated' });
      } catch {
        clear();
      }
    },

    login: async (email, password) => {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      set({ user: data.user, status: 'authenticated' });
    },

    register: async (input) => {
      const { data } = await api.post<AuthResponse>('/auth/register', input);
      setAccessToken(data.accessToken);
      set({ user: data.user, status: 'authenticated' });
    },

    loginWithGoogle: async (idToken) => {
      const { data } = await api.post<AuthResponse>('/auth/google', { idToken });
      setAccessToken(data.accessToken);
      set({ user: data.user, status: 'authenticated' });
    },

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        clear();
      }
    },
  };
});
