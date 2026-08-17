import { validateSession } from '../services/sessionService.js';

const extractRawToken = (req) => {
  let rawToken = req.cookies?.spicify_session || req.cookies?.token;

  if (!rawToken && req.headers.cookie) {
    const match = req.headers.cookie.match(/spicify_session=([^;]+)/);
    if (match) rawToken = match[1];
  }

  if (!rawToken && req.headers.authorization?.startsWith('Bearer ')) {
    rawToken = req.headers.authorization.split(' ')[1];
  }

  return rawToken;
};

export const requireAuth = async (req, res, next) => {
  try {
    const rawToken = extractRawToken(req);

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.'
        }
      });
    }

    const user = await validateSession(rawToken);

    if (!user) {
      res.clearCookie('spicify_session');
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.'
        }
      });
    }

    req.user = user;
    req.rawToken = rawToken;
    next();
  } catch (err) {
    console.error('requireAuth Middleware Error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Authentication processing failed' }
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const rawToken = extractRawToken(req);

    if (rawToken) {
      const user = await validateSession(rawToken);
      if (user) {
        req.user = user;
        req.rawToken = rawToken;
      }
    }
    next();
  } catch (err) {
    next();
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied. Admin privileges required.' }
    });
  }
  next();
};

export const authenticate = requireAuth;
