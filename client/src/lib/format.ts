import type { AuthorSummary } from './types';

export function fullName(a: AuthorSummary): string {
  return `${a.firstName} ${a.lastName}`.trim();
}

export function initials(a: AuthorSummary): string {
  return `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
}

/** Compact relative time: "just now", "5m", "3h", "2d", else a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 45) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
