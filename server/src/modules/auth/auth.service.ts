import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/http.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../../lib/jwt.js';
import { parseDuration } from '../../lib/duration.js';
import { env } from '../../env.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string; // raw — caller sets it as an httpOnly cookie
  refreshExpiresAt: Date;
}

/** Creates an access token + a rotated, DB-backed refresh token for a user. */
async function issueTokens(userId: string): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + parseDuration(env.REFRESH_TOKEN_TTL));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return { accessToken: signAccessToken(userId), refreshToken, refreshExpiresAt };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: User; tokens: IssuedTokens }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });

  return { user, tokens: await issueTokens(user.id) };
}

export async function login(input: LoginInput): Promise<{ user: User; tokens: IssuedTokens }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Verify against a real or dummy hash either way to reduce timing/user-enumeration signal.
  const ok = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!user || !ok) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return { user, tokens: await issueTokens(user.id) };
}

/** Validates a presented refresh token, rotates it, and returns fresh tokens. */
export async function rotateRefreshToken(rawToken: string): Promise<IssuedTokens> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
  });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired session');
  }

  // Rotate: revoke the presented token, then issue a new pair.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(record.userId);
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUserById(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
