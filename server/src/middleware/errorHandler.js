import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled API Error on ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
};
