// Access tokens are stateless JWTs; refresh tokens are opaque strings stored hashed in the DB.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface AccessTokenPayload {
  sub: string; // user id
}

/** Signs a short-lived access token (TTL from env.ACCESS_TOKEN_TTL, e.g. "15m"). */
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    // Cast needed: jsonwebtoken's type doesn't accept our arbitrary "<n><unit>" string.
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

/** Verifies signature + expiry and returns the payload; throws if invalid/expired/malformed. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Malformed access token');
  }
  return { sub: String(decoded.sub) };
}

/** Opaque refresh token — the raw value is only ever sent to the client cookie. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/** We store only the SHA-256 hash, so a DB leak cannot reveal usable refresh tokens. */
export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
