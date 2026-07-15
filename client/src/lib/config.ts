export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

// turns a server-relative path like "/uploads/x.jpg" into a full URL
export function resolveUpload(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}
