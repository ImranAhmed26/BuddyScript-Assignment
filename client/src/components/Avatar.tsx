import type { AuthorSummary } from '../lib/types';
import { resolveUpload } from '../lib/config';
import { fullName, initials } from '../lib/format';

interface AvatarProps {
  user: AuthorSummary;
  size?: number;
  className?: string;
}

// size is a prop rather than a fixed value since this gets reused at several sizes across the app
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
