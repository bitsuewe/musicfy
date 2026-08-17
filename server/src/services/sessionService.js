import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const memorySessions = new Map();
export const memoryUsers = new Map();

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

  try {
    const session = await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });
    return { session, rawToken };
  } catch (err) {
    logger.warn('Prisma Session create fallback active:', err.message);
    memorySessions.set(tokenHash, { userId, expiresAt });
    return { session: { id: tokenHash, userId, expiresAt }, rawToken };
  }
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

    if (session) {
      if (new Date() > new Date(session.expiresAt)) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        return null;
      }
      return session.user;
    }
  } catch (err) {
    logger.warn('Prisma Session validate fallback active:', err.message);
  }

  const mem = memorySessions.get(tokenHash);
  if (!mem || new Date() > new Date(mem.expiresAt)) return null;

  let user = await prisma.user.findUnique({
    where: { id: mem.userId },
    select: { id: true, username: true, email: true, avatar: true, emailVerified: true, role: true, createdAt: true }
  }).catch(() => null);

  if (!user) {
    for (const u of memoryUsers.values()) {
      if (u.id === mem.userId) {
        user = u;
        break;
      }
    }
  }

  return user;
};

export const revokeSession = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  memorySessions.delete(tokenHash);

  try {
    await prisma.session.deleteMany({ where: { tokenHash } });
  } catch (err) {}
};

export const revokeAllUserSessions = async (userId) => {
  if (!userId) return;
  for (const [k, v] of memorySessions.entries()) {
    if (v.userId === userId) memorySessions.delete(k);
  }

  try {
    await prisma.session.deleteMany({ where: { userId } });
  } catch (err) {}
};
