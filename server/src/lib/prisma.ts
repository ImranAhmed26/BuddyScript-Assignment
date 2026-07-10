import { PrismaClient } from '@prisma/client';
import { isProd } from '../env.js';

// Single shared client. `log` kept minimal in prod for performance.
export const prisma = new PrismaClient({
  log: isProd ? ['error'] : ['warn', 'error'],
});
