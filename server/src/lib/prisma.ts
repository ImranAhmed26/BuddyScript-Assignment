// Import this shared client everywhere instead of `new PrismaClient()` to avoid multiple pools.
import { PrismaClient } from '@prisma/client';
import { isProd } from '../env.js';

export const prisma = new PrismaClient({
  log: isProd ? ['error'] : ['warn', 'error'],
});
