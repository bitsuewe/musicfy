import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let dbStatus = {
  isAvailable: false,
  lastChecked: 0,
  checking: false
};

/**
 * Fast circuit-breaker db query wrapper
 * Prevents stalling when database (e.g. Supabase tenant) is unreachable/paused
 */
export const safeDbQuery = async (queryFn, fallback = null, timeoutMs = 1500) => {
  const now = Date.now();
  // If known to be offline within last 45s, skip query immediately to avoid 8-second hang
  if (!dbStatus.isAvailable && now - dbStatus.lastChecked < 45000 && dbStatus.lastChecked > 0) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }

  try {
    const queryPromise = queryFn(prisma);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_QUERY_TIMEOUT')), timeoutMs)
    );
    const result = await Promise.race([queryPromise, timeoutPromise]);
    dbStatus.isAvailable = true;
    dbStatus.lastChecked = Date.now();
    return result;
  } catch (err) {
    dbStatus.isAvailable = false;
    dbStatus.lastChecked = Date.now();
    return typeof fallback === 'function' ? fallback(err) : fallback;
  }
};
