// Business logic for auth: registration, login, refresh-token lifecycle.
import type { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
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

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string; // raw — caller sets it as an httpOnly cookie
  refreshExpiresAt: Date;
}

/** Creates an access token + a rotated, DB-backed refresh token for a user. */
async function issueTokens(userId: string): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + parseDuration(env.REFRESH_TOKEN_TTL));

  // Only the hash is persisted, so a DB leak alone can't be replayed as a session.
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
  // Always verify against a hash to reduce timing/user-enumeration signal.
  const ok = await verifyPassword(
    input.password,
    user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva',
  );
  // Google-only accounts have no passwordHash — reject rather than let a null hash "match".
  if (!user || !user.passwordHash || !ok) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return { user, tokens: await issueTokens(user.id) };
}

/** Verifies a Google ID token, then finds-or-creates a user (linked by email if it already exists). */
export async function loginWithGoogle(idToken: string): Promise<{ user: User; tokens: IssuedTokens }> {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new ApiError(401, 'Invalid Google token');
  }
  if (payload.email_verified === false) {
    throw new ApiError(401, 'Google account email is not verified');
  }

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email }] } });

  if (user) {
    // Link: a pre-existing email/password account signing in with Google for the first time.
    if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
    }
  } else {
    user = await prisma.user.create({
      data: {
        firstName: payload.given_name ?? 'Google',
        lastName: payload.family_name ?? 'User',
        email,
        googleId: payload.sub,
        avatarUrl: payload.picture ?? null,
      },
    });
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

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(record.userId);
}

// updateMany so a missing/already-revoked token no-ops instead of throwing.
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// 404s if not found, e.g. account deleted after the access token was issued.
export async function getUserById(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
