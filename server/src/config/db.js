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
 * Resilient database query wrapper
 * Supports remote cloud databases (Supabase SSL) with generous timeouts for cloud deployments
 */
export const safeDbQuery = async (queryFn, fallback = null, timeoutMs = 10000) => {
  const now = Date.now();
  // If circuit breaker tripped (5+ consecutive failures within last 10s), use fast fallback
  if (!dbStatus.isAvailable && now - dbStatus.lastChecked < 10000 && dbStatus.consecutiveFailures >= 5) {
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
    if (dbStatus.consecutiveFailures >= 5) {
      dbStatus.isAvailable = false;
    }
    dbStatus.lastChecked = Date.now();
    return typeof fallback === 'function' ? fallback(err) : fallback;
  }
};
