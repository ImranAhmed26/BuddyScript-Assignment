// Shapes/functions for turning Prisma models into API-safe response bodies.
import type { User } from '@prisma/client';

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}

/** Strips sensitive fields (passwordHash) before sending a user to the client. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

/** Compact author shape embedded in posts/comments. */
export interface AuthorSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
