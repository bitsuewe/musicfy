import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let dbStatus = {
  isAvailable: true,
  consecutiveFailures: 0,
  lastChecked: 0
};

/**
 * Fast circuit-breaker db query wrapper
 * Supports remote cloud databases (Supabase SSL) while preventing unbounded hangs
 */
export const safeDbQuery = async (queryFn, fallback = null, timeoutMs = 7000) => {
  const now = Date.now();
  // If circuit breaker tripped (3+ consecutive failures within last 12s), use fast fallback
  if (!dbStatus.isAvailable && now - dbStatus.lastChecked < 12000 && dbStatus.consecutiveFailures >= 3) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }

  try {
    const queryPromise = queryFn(prisma);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_QUERY_TIMEOUT')), timeoutMs)
    );
    const result = await Promise.race([queryPromise, timeoutPromise]);
    dbStatus.isAvailable = true;
    dbStatus.consecutiveFailures = 0;
    dbStatus.lastChecked = Date.now();
    return result;
  } catch (err) {
    dbStatus.consecutiveFailures += 1;
    if (dbStatus.consecutiveFailures >= 3) {
      dbStatus.isAvailable = false;
    }
    dbStatus.lastChecked = Date.now();
    return typeof fallback === 'function' ? fallback(err) : fallback;
  }
};
