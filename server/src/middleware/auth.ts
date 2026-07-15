// Auth middleware: gates routes behind a valid Bearer access token.
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/http.js';
import { verifyAccessToken } from '../lib/jwt.js';

// Augment Express Request with the authenticated user id.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }
  try {
    req.userId = verifyAccessToken(token).sub;
    next();
  } catch {
    // bad signature, expired, malformed - doesn't matter which, client just gets a generic 401
    next(new ApiError(401, 'Invalid or expired token'));
  }
}
