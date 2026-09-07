import 'dotenv/config';
import pkg from '@prisma/client/default.js';
const { PrismaClient } = pkg;

const SUPABASE_VERIFIED_URL = "postgresql://postgres.ntymdlksqavumuqkshce:lXvzp4gNFJF22K5v@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

export const normalizeDatabaseUrl = (rawUrl) => {
  let url = (rawUrl || '').trim() || SUPABASE_VERIFIED_URL;

  // If URL uses IPv6-only direct host db.<ref>.supabase.co:5432, auto-convert to IPv4 pooler
  const directMatch = url.match(/postgresql:\/\/([^:]+):(.+)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?\/(.*)/i);
  if (directMatch) {
    const [, user, password, projectRef, rest] = directMatch;
    const regionMap = {
      ntymdlksqavumuqkshce: 'us-east-2',
      bnfjhtaovbrdyagumumx: 'us-west-2'
    };
    const region = regionMap[projectRef] || 'us-east-2';
    const poolerUser = user.includes('.') ? user : `${user}.${projectRef}`;
    const dbName = rest ? rest.split('?')[0] : 'postgres';
    url = `postgresql://${poolerUser}:${password}@aws-0-${region}.pooler.supabase.com:6543/${dbName}?pgbouncer=true`;
  }

  // Auto-correct pooler port 5432 to 6543 with pgbouncer=true if present
  if (url.includes('pooler.supabase.com:5432')) {
    url = url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
    if (!url.includes('pgbouncer=true')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
  }

  return url;
};

let dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
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
