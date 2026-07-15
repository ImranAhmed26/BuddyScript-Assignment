// Route definitions for /api/auth.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { googleLoginSchema, loginSchema, registerSchema } from './auth.schemas.js';
import * as authController from './auth.controller.js';

// slows down brute-force/credential-stuffing attempts on these endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);
authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);
authRouter.post(
  '/google',
  authLimiter,
  validate({ body: googleLoginSchema }),
  asyncHandler(authController.google),
);
// no requireAuth here - these two work off the httpOnly cookie instead
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
