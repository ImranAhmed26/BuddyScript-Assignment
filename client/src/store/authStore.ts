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
  /** Restore a session from the refresh-token cookie on app load. */
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  const clear = () => {
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  };

  // If a request can't be refreshed, the axios layer drops us back to login.
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

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        clear();
      }
    },
  };
});
