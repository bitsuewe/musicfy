import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { createSession, revokeSession, revokeAllUserSessions, hashToken } from '../services/sessionService.js';
import { createEmailVerificationToken, verifyEmailToken, createPasswordResetToken, sendMockEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

const COOKIE_NAME = 'spicify_session';
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

// Configurable Bcrypt Salt Rounds from environment variables (Default: 12)
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

const formatSafeUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  avatar: u.avatar || u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`,
  emailVerified: u.emailVerified === true,
  role: u.role || 'USER'
});

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Username, email, and password are all required.' }
      });
    }

    const trimmedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address (e.g. name@example.com).' }
      });
    }

    // Validate username format and length
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USERNAME', message: 'Username must be between 3 and 30 characters.' }
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters long.' }
      });
    }

    // Check directly in Supabase if Email or Username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { username: { equals: trimmedUsername, mode: 'insensitive' } }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === normalizedEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'This email address is already registered. Please sign in or use a different email.'
          }
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'USERNAME_ALREADY_EXISTS',
          message: 'This username is already taken. Please choose a different username.'
        }
      });
    }

    // Hash password with Bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedUsername)}`;

    // Create user directly in Supabase
    const dbUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        email: normalizedEmail,
        passwordHash,
        avatar,
        emailVerified: false
      }
    });

    // Create session in Supabase
    const { rawToken } = await createSession(dbUser.id);
    res.cookie(COOKIE_NAME, rawToken, COOKIE_OPTIONS);

    // Create verification token & send email
    try {
      const verificationToken = await createEmailVerificationToken(dbUser.id);
      sendMockEmail(normalizedEmail, 'Verify your Spicify account', `Click to verify: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`);
    } catch (e) {
      logger.warn('Email verification note:', e.message);
    }

    return res.status(201).json({
      success: true,
      user: formatSafeUser(dbUser),
      token: rawToken
    });
  } catch (err) {
    logger.error('Register controller error:', err);
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'account';
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_FIELD', message: `An account with this ${field} already exists.` }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create account. Please try again.', details: err.message }
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, emailOrUsername } = req.body;
    const input = (email || emailOrUsername || '').trim();

    if (!input || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Email or username and password are required.' }
      });
    }

    const lowerInput = input.toLowerCase();

    // Query Supabase directly (case-insensitive for both email and username)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: lowerInput, mode: 'insensitive' } },
          { username: { equals: input, mode: 'insensitive' } },
          { username: { equals: lowerInput, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      // Dummy compare to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$eImiTXuWVxfM37uY4JANjO56E2452586796982928372625242524');
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Bcrypt comparison
    let isMatch = false;
    const hash = user.passwordHash;
    if (hash && typeof hash === 'string') {
      isMatch = await bcrypt.compare(password, hash);
      if (!isMatch && typeof password === 'string') {
        isMatch = await bcrypt.compare(password.trim(), hash);
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Create session in Supabase
    const { rawToken } = await createSession(user.id);
    res.cookie(COOKIE_NAME, rawToken, COOKIE_OPTIONS);

    return res.json({
      success: true,
      user: formatSafeUser(user),
      token: rawToken
    });
  } catch (err) {
    logger.error('Login controller error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed. Please try again.', details: err.message }
    });
  }
};

export const logout = async (req, res) => {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME] || req.rawToken;
    if (rawToken) {
      await revokeSession(rawToken);
    }
  } catch (err) {}
  res.clearCookie(COOKIE_NAME);
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

export const logoutAll = async (req, res) => {
  try {
    if (req.user?.id) {
      await revokeAllUserSessions(req.user.id);
    }
  } catch (err) {}
  res.clearCookie(COOKIE_NAME);
  return res.json({ success: true, message: 'Logged out from all devices.' });
};

export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthenticated.' }
    });
  }

  return res.json({
    success: true,
    user: formatSafeUser(req.user),
    token: req.rawToken || null
  });
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const verified = await verifyEmailToken(token);

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VERIFICATION_TOKEN', message: 'Verification token is invalid or expired.' }
      });
    }

    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Verification failed.' } });
  }
};

export const resendVerification = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required.' } });

    const verificationToken = await createEmailVerificationToken(req.user.id);
    sendMockEmail(req.user.email, 'Verify your Spicify account', `Token: ${verificationToken}`);

    return res.json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to resend verification.' } });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } }).catch(() => null);
      if (user) {
        const resetToken = await createPasswordResetToken(user.id);
        sendMockEmail(user.email, 'Reset your Spicify password', `Reset Token: ${resetToken}`);
      }
    }

    return res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    });
  } catch (err) {
    return res.json({ success: true, message: 'If an account exists for this email, a password reset link has been sent.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'New password must be at least 8 characters long.' }
      });
    }

    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({ where: { tokenHash } }).catch(() => null);

    if (!resetRecord || new Date() > new Date(resetRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESET_TOKEN', message: 'Password reset token is invalid or expired.' }
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    });

    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } }).catch(() => {});
    await revokeAllUserSessions(resetRecord.userId);

    return res.json({ success: true, message: 'Password updated successfully. Please log in again.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Password reset failed.' } });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'New password must be at least 8 characters long.' }
      });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (!dbUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' }
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' }
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    await revokeAllUserSessions(userId);

    return res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Change password failed.' } });
  }
};
