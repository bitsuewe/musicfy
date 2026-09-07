import 'dotenv/config';
import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;

const SUPABASE_VERIFIED_URL = "postgresql://postgres.bnfjhtaovbrdyagumumx:bwskIKPN7S6VtyIE@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

let dbUrl = (process.env.DATABASE_URL || '').trim() || SUPABASE_VERIFIED_URL;

// Auto-correct pooler port 5432 to 6543 with pgbouncer=true if present
if (dbUrl.includes('pooler.supabase.com:5432')) {
  dbUrl = dbUrl.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  if (!dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
}

process.env.DATABASE_URL = dbUrl;

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

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
