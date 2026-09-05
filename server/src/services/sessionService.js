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

  // Always write to persistent disk/memory store immediately
  savePersistentSession(tokenHash, { userId, expiresAt: expiresAt.toISOString() });

  // Asynchronously sync to database with circuit breaker
  safeDbQuery(
    (p) =>
      p.session.create({
        data: {
          userId,
          tokenHash,
          expiresAt
        }
      }),
    null,
    1500
  ).catch((err) => {
    logger.warn('Session DB async sync note:', err.message);
  });

  return {
    session: { id: tokenHash, userId, expiresAt },
    rawToken
  };
};

export const validateSession = async (rawToken) => {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  // 1. Fast Path: check persistent session store
  const persistentSess = findPersistentSession(tokenHash);
  if (persistentSess) {
    let user = findPersistentUserById(persistentSess.userId);
    if (!user) {
      user = await safeDbQuery(
        (p) =>
          p.user.findUnique({
            where: { id: persistentSess.userId },
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
              emailVerified: true,
              role: true,
              createdAt: true
            }
          }),
        null,
        1500
      );
      if (user) {
        savePersistentUser(user);
      }
    }
    if (user) {
      return user;
    }
  }

  // 2. Database Fallback (with circuit breaker)
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
      1500
    );

    if (session) {
      if (new Date() > new Date(session.expiresAt)) {
        safeDbQuery((p) => p.session.delete({ where: { id: session.id } })).catch(() => {});
        deletePersistentSession(tokenHash);
        return null;
      }
      if (session.user) {
        savePersistentUser(session.user);
        savePersistentSession(tokenHash, {
          userId: session.userId,
          expiresAt: session.expiresAt.toISOString()
        });
        return session.user;
      }
    }
  } catch (err) {
    logger.warn('Prisma Session validate fallback active:', err.message);
  }

  return null;
};

export const revokeSession = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  deletePersistentSession(tokenHash);

  safeDbQuery((p) => p.session.deleteMany({ where: { tokenHash } }), null, 1500).catch(() => {});
};

export const revokeAllUserSessions = async (userId) => {
  if (!userId) return;
  deleteAllPersistentUserSessions(userId);

  safeDbQuery((p) => p.session.deleteMany({ where: { userId } }), null, 1500).catch(() => {});
};
