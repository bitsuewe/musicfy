import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const runCleanupJob = async () => {
  try {
    logger.info('Running background database maintenance job...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete uncompleted history logs older than 30 days
    const deleted = await prisma.listeningHistory.deleteMany({
      where: {
        completed: false,
        playedAt: { lt: thirtyDaysAgo }
      }
    }).catch(() => ({ count: 0 }));

    logger.info(`Cleanup job complete. Purged ${deleted.count} stale records.`);
  } catch (err) {
    logger.error('Database cleanup job encountered an error:', err);
  }
};
