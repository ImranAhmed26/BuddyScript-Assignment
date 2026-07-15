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

// Factory instead of a top-level app so tests can spin up isolated instances.
export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // sits behind Render/Railway's proxy, need real IPs for rate-limit

  // default CORP would block the SPA (different origin) from loading /uploads images
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN, // credentials: true means this can't be a wildcard
      credentials: true,
    }),
  );
  // posts are text only, 1mb is plenty. images go through the multipart upload route
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api', commentsRouter);

  // these have to come last for Express's error/404 handling to work
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
