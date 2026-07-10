export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

// Origin without the trailing "/api" — used to resolve uploaded image paths.
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/** Resolve a server-relative asset path (e.g. "/uploads/x.jpg") to an absolute URL. */
export function resolveUpload(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}
