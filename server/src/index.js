import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { prisma } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { runCleanupJob } from './jobs/cleanupJob.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable trust proxy for Render / Cloudflare reverse proxy headers
app.set('trust proxy', 1);

const parseAllowedOrigins = () => {
  const custom = (process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...custom, 'http://localhost:5173', 'http://127.0.0.1:5173']));
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

// Production Security Headers (Spotify Standard)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Production Authentication Rate Limiting (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again in a few minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }
});

// Health & Root Status Endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Musicfy API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    },
    message: 'Musicfy backend API is running successfully.'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Musicfy API',
    security: 'Spotify Production-Grade (Bcrypt 12, Rate Limited, Helmet, JWT Cookie)',
    databaseProvider: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Mount routes on /api AND as direct fallback (e.g. /auth/login and /api/auth/login both work)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/api', apiLimiter, apiRoutes);
app.use('/', apiLimiter, apiRoutes);

// Socket.io Real-time Social Listener
io.on('connection', (socket) => {
  socket.on('user_listening', (data) => {
    socket.broadcast.emit('friend_activity', {
      user: data.user,
      track: data.track,
      timestamp: new Date().toISOString()
    });
  });
});

// 404 Catch-All & Global Error Handling Middleware
app.use((req, res) => {
  notFoundHandler(req, res);
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  logger.info(`🚀 Musicfy API Server running on http://localhost:${PORT}`);
  
  // Initial seed check & background job schedule
  try {
    const userCount = await prisma.user.count().catch(() => 0);
    if (userCount === 0) {
      logger.info('Database empty. Running seed...');
      import('./utils/seed.js');
    }
  } catch (e) {}

  // Run cleanup job every 24 hours
  setInterval(runCleanupJob, 24 * 60 * 60 * 1000);
});
