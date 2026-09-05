import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { Innertube, UniversalCache } from 'youtubei.js';
import { Readable } from 'stream';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

// Cache audio URLs for 2 hours to provide instant repeat streams
const audioUrlCache = new Map();
const CACHE_LIFETIME_MS = 2 * 60 * 60 * 1000;

let innertubeInstance = null;
let initPromise = null;

export const getInnertube = async () => {
  if (innertubeInstance) return innertubeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      logger.info('Initializing Innertube client...');
      innertubeInstance = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true
      });
      logger.info('Innertube client successfully initialized.');
      return innertubeInstance;
    } catch (err) {
      logger.error('Failed to initialize Innertube client:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
};

/**
 * Extracts direct playable audio stream URL for a YouTube video ID
 * Uses high-fidelity yt-dlp engine with Innertube fallback
 */
export const getDirectAudioUrl = async (videoId) => {
  const sanitizedId = String(videoId || '').replace(/[^a-zA-Z0-9_\-]/g, '').trim();
  if (!sanitizedId) return null;

  // Check cache
  const cached = audioUrlCache.get(sanitizedId);
  if (cached && Date.now() - cached.timestamp < CACHE_LIFETIME_MS) {
    return cached.url;
  }

  // Tier 1: yt-dlp direct audio stream extraction across system and local binaries
  const candidateCommands = [
    `yt-dlp -g -f bestaudio "https://www.youtube.com/watch?v=${sanitizedId}"`,
    `./yt-dlp -g -f bestaudio "https://www.youtube.com/watch?v=${sanitizedId}"`,
    `python3 -m yt_dlp -g -f bestaudio "https://www.youtube.com/watch?v=${sanitizedId}"`,
    `python -m yt_dlp -g -f bestaudio "https://www.youtube.com/watch?v=${sanitizedId}"`,
    `py -m yt_dlp -g -f bestaudio "https://www.youtube.com/watch?v=${sanitizedId}"`
  ];

  for (const cmd of candidateCommands) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 14000 });
      const lines = stdout.trim().split('\n').map((l) => l.trim()).filter((l) => l.startsWith('http'));
      if (lines.length > 0 && lines[0]) {
        const directUrl = lines[0];
        audioUrlCache.set(sanitizedId, { url: directUrl, timestamp: Date.now() });
        return directUrl;
      }
    } catch (err) {}
  }

  // Tier 2: Innertube fallback
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(sanitizedId);
    const audioFormat = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (audioFormat) {
      const decipheredUrl = audioFormat.decipher ? await audioFormat.decipher(yt.session.player).catch(() => null) : audioFormat.url;
      if (decipheredUrl && decipheredUrl.startsWith('http')) {
        audioUrlCache.set(sanitizedId, { url: decipheredUrl, timestamp: Date.now() });
        return decipheredUrl;
      }
    }
  } catch (err) {
    logger.warn(`Innertube fallback extraction warning for ${sanitizedId}:`, err.message);
  }

  return null;
};

/**
 * Stream real track audio directly to response using yt-dlp native stdout stream
 * @param {string} videoId 
 * @param {import('express').Response} res 
 * @param {boolean} asDownload 
 * @param {string} filename 
 */
export const pipeAudioStream = async (videoId, res, asDownload = false, filename = 'track.webm') => {
  const sanitizedId = String(videoId || '').replace(/[^a-zA-Z0-9_\-]/g, '').trim();
  if (!sanitizedId) {
    return res.status(400).json({ error: 'Valid YouTube Video ID is required' });
  }

  const cleanFilename = `${filename.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_\-\s.]/g, '').trim() || sanitizedId}.webm`;

  const headers = {
    'Content-Type': 'audio/webm',
    'Cache-Control': 'public, max-age=86400',
    'Transfer-Encoding': 'chunked'
  };

  if (asDownload) {
    headers['Content-Disposition'] = `attachment; filename="${cleanFilename}"`;
  }

  // Tier 1: Direct native yt-dlp stdout streaming
  const candidateExecutables = [
    { cmd: 'yt-dlp', args: ['-f', 'bestaudio', '--no-playlist', '-o', '-', `https://www.youtube.com/watch?v=${sanitizedId}`] },
    { cmd: './yt-dlp', args: ['-f', 'bestaudio', '--no-playlist', '-o', '-', `https://www.youtube.com/watch?v=${sanitizedId}`] },
    { cmd: 'python3', args: ['-m', 'yt_dlp', '-f', 'bestaudio', '--no-playlist', '-o', '-', `https://www.youtube.com/watch?v=${sanitizedId}`] },
    { cmd: 'python', args: ['-m', 'yt_dlp', '-f', 'bestaudio', '--no-playlist', '-o', '-', `https://www.youtube.com/watch?v=${sanitizedId}`] },
    { cmd: 'py', args: ['-m', 'yt_dlp', '-f', 'bestaudio', '--no-playlist', '-o', '-', `https://www.youtube.com/watch?v=${sanitizedId}`] }
  ];

  for (const execOption of candidateExecutables) {
    try {
      const child = spawn(execOption.cmd, execOption.args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let headerWritten = false;

      const streamSuccess = await new Promise((resolve) => {
        child.stdout.on('data', (chunk) => {
          if (!headerWritten) {
            headerWritten = true;
            res.writeHead(200, headers);
            resolve(true);
          }
          res.write(chunk);
        });

        child.stdout.on('end', () => {
          if (headerWritten) {
            res.end();
          }
        });

        child.on('error', () => {
          if (!headerWritten) resolve(false);
        });

        // 10s timeout to start emitting chunks
        setTimeout(() => {
          if (!headerWritten) {
            try { child.kill('SIGTERM'); } catch (e) {}
            resolve(false);
          }
        }, 10000);
      });

      if (streamSuccess) {
        res.on('close', () => {
          try { child.kill('SIGTERM'); } catch (e) {}
        });
        return;
      }
    } catch (e) {}
  }

  // Tier 2: Fallback via direct URL extraction and axios pipe
  try {
    const directUrl = await getDirectAudioUrl(sanitizedId);
    if (directUrl) {
      const response = await axios({
        method: 'get',
        url: directUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        timeout: 20000
      });

      if (!res.headersSent) {
        res.writeHead(200, headers);
      }

      response.data.pipe(res);
      res.on('close', () => {
        if (response.data && response.data.destroy) {
          response.data.destroy();
        }
      });
      return;
    }
  } catch (err) {
    logger.warn(`Direct URL fallback error for ${sanitizedId}:`, err.message);
  }

  if (!res.headersSent) {
    return res.status(502).json({
      error: 'Audio stream temporarily unavailable for this track',
      videoId: sanitizedId
    });
  }
};
