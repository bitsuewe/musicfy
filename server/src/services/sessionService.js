import crypto from 'crypto';
import { prisma, safeDbQuery } from '../config/db.js';
import { logger } from '../utils/logger.js';
import {
  memorySessions,
  memoryUsers,
  savePersistentSession,
  findPersistentSession,
  deletePersistentSession,
  deleteAllPersistentUserSessions,
  findPersistentUserById,
  savePersistentUser
} from './persistentUserStore.js';

export { memorySessions, memoryUsers };

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateRawToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const createSession = async (userId) => {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Days

  // Write to memory/disk store for fast local lookups
  savePersistentSession(tokenHash, { userId, expiresAt: expiresAt.toISOString() });

  // Await saving to Supabase database so session persists across deployments and container restarts
  await safeDbQuery(
    (p) =>
      p.session.create({
        data: {
          userId,
          tokenHash,
          expiresAt
        }
      }),
    null,
    10000
  ).catch((err) => {
    logger.warn('Session DB creation note:', err.message);
  });

  return {
    session: { id: tokenHash, userId, expiresAt },
    rawToken
  };
};

export const validateSession = async (rawToken) => {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  // 1. Fast Path: check persistent memory/disk store
  const persistentSess = findPersistentSession(tokenHash);
  if (persistentSess && new Date(persistentSess.expiresAt) > new Date()) {
    let user = findPersistentUserById(persistentSess.userId);
    if (user) {
      return user;
    }
  }

  // 2. Database Lookup (vital for new deployments, container restarts, or another device)
  try {
    const session = await safeDbQuery(
      (p) =>
        p.session.findUnique({
          where: { tokenHash },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                emailVerified: true,
                role: true,
                createdAt: true
              }
            }
          }
        }),
      null,
      10000
    );

    if (session && session.user && new Date(session.expiresAt) > new Date()) {
      savePersistentSession(tokenHash, { userId: session.user.id, expiresAt: session.expiresAt.toISOString ? session.expiresAt.toISOString() : session.expiresAt });
      savePersistentUser(session.user);
      return session.user;
    }
  } catch (e) {
    logger.warn('Session DB validation note:', e.message);
  }

  return null;
};

export const revokeSession = async (rawToken) => {
  if (!rawToken) return false;
  const tokenHash = hashToken(rawToken);

  deletePersistentSession(tokenHash);

  await safeDbQuery(
    (p) => p.session.delete({ where: { tokenHash } }),
    null,
    10000
  ).catch(() => {});

  return true;
};

export const revokeAllUserSessions = async (userId) => {
  if (!userId) return false;

  deleteAllPersistentUserSessions(userId);

  await safeDbQuery(
    (p) => p.session.deleteMany({ where: { userId } }),
    null,
    10000
  ).catch(() => {});

  return true;
};
