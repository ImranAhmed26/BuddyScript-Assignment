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

// strips passwordHash (and anything else not in PublicUser) before this goes to the client
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

// what gets embedded as "author" on posts/comments
export interface AuthorSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
