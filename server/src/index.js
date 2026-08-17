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

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }
});

// Production Security Headers (Spotify Standard)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Production Authentication Rate Limiting (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts from this IP address. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter, apiRoutes);

// 404 & Global Error Handling Middleware
app.use('/api/*', notFoundHandler);
app.use(errorHandler);

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

// Health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Musicfy API',
    security: 'Spotify Production-Grade (Bcrypt 12, Rate Limited, Helmet, JWT Cookie)',
    databaseProvider: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

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
