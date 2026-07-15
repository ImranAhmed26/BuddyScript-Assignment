// HTTP layer for auth; business logic lives in auth.service.ts.
import type { CookieOptions, Request, Response } from 'express';
import { isProd } from '../../env.js';
import { ApiError } from '../../lib/http.js';
import { toPublicUser } from '../../lib/serialize.js';
import * as authService from './auth.service.js';

export const REFRESH_COOKIE = 'refresh_token';

// scoped to /api/auth so the cookie never goes out on other requests, and httpOnly keeps it away from JS
function refreshCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd, // needs HTTPS, only on in prod
    sameSite: isProd ? 'none' : 'lax', // prod is cross-site (separate frontend/API domains)
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

export async function google(req: Request, res: Response): Promise<void> {
  const { user, tokens } = await authService.loginWithGoogle(req.body.idToken);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(tokens.refreshExpiresAt));
  res.json({ user: toPublicUser(user), accessToken: tokens.accessToken });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw new ApiError(401, 'No active session');
  const tokens = await authService.rotateRefreshToken(raw);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(tokens.refreshExpiresAt));
  res.json({ accessToken: tokens.accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  // if there's no cookie there's nothing to revoke - logout still just succeeds
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) await authService.revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getUserById(req.userId!); // req.userId is guaranteed by requireAuth
  res.json({ user: toPublicUser(user) });
}
