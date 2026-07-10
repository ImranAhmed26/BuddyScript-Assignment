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

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Railway) so secure cookies + rate-limit see real IPs.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Uploaded images are served here but embedded by the client on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true, // allow the refresh cookie
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Static hosting for locally-stored uploads.
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api', commentsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
