// Shared axios instance: attaches the access token and auto-refreshes+retries on 401.
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE } from './config';

// In-memory only (never localStorage) to limit XSS exposure.
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh: concurrent 401s share one pending refresh request instead of racing.
let refreshing: Promise<string | null> | null = null;
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = axios
      .post<{ accessToken: string }>(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

let onAuthFailure: (() => void) | null = null;
export const setAuthFailureHandler = (fn: (() => void) | null) => {
  onAuthFailure = fn;
};

const AUTH_PATHS = ['/auth/refresh', '/auth/login', '/auth/register'];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    // Skip refresh for auth endpoints themselves to avoid an infinite loop.
    const skipRefresh = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (error.response?.status === 401 && original && !original._retry && !skipRefresh) {
      original._retry = true; // avoid retrying the same request twice
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      onAuthFailure?.();
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from an Axios/API error. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; details?: unknown } | undefined;
    return data?.error ?? err.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
