import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

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

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return {
    session: { id: session.id, userId, expiresAt },
    rawToken
  };
};

export const validateSession = async (rawToken) => {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  try {
    const session = await prisma.session.findUnique({
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
    });

    if (session && session.user && new Date(session.expiresAt) > new Date()) {
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

  try {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return true;
  } catch (e) {
    logger.warn('Revoke session note:', e.message);
    return false;
  }
};

export const revokeAllUserSessions = async (userId) => {
  if (!userId) return false;

  try {
    await prisma.session.deleteMany({ where: { userId } });
    return true;
  } catch (e) {
    logger.warn('Revoke all sessions note:', e.message);
    return false;
  }
};
