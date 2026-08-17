import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'musicfy_super_secret_jwt_key_2026';

export const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};
