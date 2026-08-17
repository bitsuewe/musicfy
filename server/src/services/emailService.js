import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { hashToken, generateRawToken } from './sessionService.js';
import { logger } from '../utils/logger.js';

export const createEmailVerificationToken = async (userId) => {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

  try {
    await prisma.verificationToken.create({
      data: { userId, tokenHash, expiresAt }
    });
  } catch (err) {
    logger.warn('VerificationToken create notice:', err.message);
  }

  return rawToken;
};

export const verifyEmailToken = async (rawToken) => {
  if (!rawToken) return false;
  const tokenHash = hashToken(rawToken);

  try {
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { tokenHash }
    });

    if (!tokenRecord || new Date() > new Date(tokenRecord.expiresAt)) {
      if (tokenRecord) await prisma.verificationToken.delete({ where: { id: tokenRecord.id } }).catch(() => {});
      return false;
    }

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { emailVerified: true }
    });

    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } }).catch(() => {});
    return true;
  } catch (err) {
    logger.error('Verify email token failed:', err);
    return false;
  }
};

export const createPasswordResetToken = async (userId) => {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 Hour

  try {
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt }
    });
  } catch (err) {
    logger.warn('PasswordResetToken create notice:', err.message);
  }

  return rawToken;
};

export const sendMockEmail = async (to, subject, body) => {
  logger.info(`📧 [MOCK EMAIL SERVICE] To: ${to} | Subject: ${subject} | Body: ${body}`);
  return true;
};
