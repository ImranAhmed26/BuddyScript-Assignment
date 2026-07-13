import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { postsRouter } from './modules/posts/posts.routes.js';
import { commentsRouter } from './modules/comments/comments.routes.js';

// Factory (not a top-level app) so tests can build isolated instances.
export function createApp() {
  const app = express();

  // Behind a proxy (Render/Railway) so secure cookies + rate-limit see real IPs.
  app.set('trust proxy', 1);

  // Helmet's CORP default would block the cross-origin SPA from loading /uploads images.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  // Single known origin (not wildcard) required for credentials: true (refresh cookie).
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  // 1mb cap: posts are text only; images go through a separate multipart route.
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api', commentsRouter);

  // Must be last: order matters for Express error/404 handling.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
