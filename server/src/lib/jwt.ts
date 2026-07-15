// Access tokens are stateless JWTs; refresh tokens are opaque strings stored hashed in the DB.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface AccessTokenPayload {
  sub: string; // user id
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    // jsonwebtoken's types don't accept our "<n><unit>" string directly, hence the cast
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Malformed access token');
  }
  return { sub: String(decoded.sub) };
}

// raw refresh token, only ever sent back as the httpOnly cookie value
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

// We only ever persist this hash. If the DB leaks, the tokens in it are useless without the raw value.
export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
