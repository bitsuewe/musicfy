import 'dotenv/config';
import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Resilient database query wrapper
 * Runs query directly against Supabase Prisma client
 */
export const safeDbQuery = async (queryFn, fallback = null, timeoutMs = 15000) => {
  try {
    const queryPromise = queryFn(prisma);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_QUERY_TIMEOUT')), timeoutMs)
    );
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err) {
    if (fallback !== null) {
      return typeof fallback === 'function' ? fallback(err) : fallback;
    }
    throw err;
  }
};
