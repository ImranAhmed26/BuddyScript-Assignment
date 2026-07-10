import type { AuthorSummary } from '../lib/types';
import { resolveUpload } from '../lib/config';
import { fullName, initials } from '../lib/format';

interface AvatarProps {
  user: AuthorSummary;
  size?: number;
  className?: string;
}

/** Round avatar that falls back to the user's initials when no image is set. */
export function Avatar({ user, size = 40, className }: AvatarProps) {
  const dimension = { width: size, height: size };
  const src = resolveUpload(user.avatarUrl);

  if (src) {
    return (
      <img
        src={src}
        alt={fullName(user)}
        className={`bs-avatar ${className ?? ''}`}
        style={dimension}
      />
    );
  }

  return (
    <span
      className={`bs-avatar-fallback ${className ?? ''}`}
      style={{ ...dimension, fontSize: size * 0.4 }}
      aria-label={fullName(user)}
    >
      {initials(user)}
    </span>
  );
}
