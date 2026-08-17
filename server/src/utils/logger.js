// Production Logging Utility for Musicfy Backend

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (msg, meta = '') => {
    console.log(`[${timestamp()}] [INFO] ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`[${timestamp()}] [WARN] ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  error: (msg, error = '') => {
    console.error(`[${timestamp()}] [ERROR] ${msg}`, error?.stack || error || '');
  },
  debug: (msg, meta = '') => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp()}] [DEBUG] ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  }
};
