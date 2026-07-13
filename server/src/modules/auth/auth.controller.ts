// HTTP layer for auth; business logic lives in auth.service.ts.
import type { CookieOptions, Request, Response } from 'express';
import { isProd } from '../../env.js';
import { ApiError } from '../../lib/http.js';
import { toPublicUser } from '../../lib/serialize.js';
import * as authService from './auth.service.js';

export const REFRESH_COOKIE = 'refresh_token';

// httpOnly cookie scoped to /api/auth so it's never exposed to JS or other routes.
function refreshCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd, // requires HTTPS in production
    sameSite: isProd ? 'none' : 'lax', // 'none' for cross-site prod deploy
    path: '/api/auth',
    expires,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { user, tokens } = await authService.register(req.body);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(tokens.refreshExpiresAt));
  res.status(201).json({ user: toPublicUser(user), accessToken: tokens.accessToken });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, tokens } = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(tokens.refreshExpiresAt));
  res.json({ user: toPublicUser(user), accessToken: tokens.accessToken });
}

// Rotates the refresh token; old one is revoked server-side (see auth.service).
export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw new ApiError(401, 'No active session');
  const tokens = await authService.rotateRefreshToken(raw);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(tokens.refreshExpiresAt));
  res.json({ accessToken: tokens.accessToken });
}

// No-ops if there's no cookie — logout is always "successful".
export async function logout(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) await authService.revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).end();
}

// req.userId is set by the requireAuth middleware, so non-null assert is safe.
export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getUserById(req.userId!);
  res.json({ user: toPublicUser(user) });
}
