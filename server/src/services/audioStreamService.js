import { exec } from 'child_process';
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

  // Tier 1: yt-dlp direct audio stream extraction
  try {
    const cmd = `python -m yt_dlp -g -f bestaudio "https://www.youtube.com/watch?v=${sanitizedId}"`;
    const { stdout } = await execAsync(cmd, { timeout: 12000 });
    const lines = stdout.trim().split('\n').map((l) => l.trim()).filter((l) => l.startsWith('http'));
    if (lines.length > 0 && lines[0]) {
      const directUrl = lines[0];
      audioUrlCache.set(sanitizedId, { url: directUrl, timestamp: Date.now() });
      return directUrl;
    }
  } catch (err) {
    logger.warn(`yt-dlp extraction warning for ${sanitizedId}:`, err.message);
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
 * Stream real track audio directly to response
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

  try {
    const directUrl = await getDirectAudioUrl(sanitizedId);

    if (directUrl) {
      const response = await axios({
        method: 'get',
        url: directUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'identity'
        },
        timeout: 20000
      });

      const contentType = response.headers['content-type'] || 'audio/webm';
      const ext = contentType.includes('mp4') || contentType.includes('m4a') ? 'm4a' : 'webm';
      const cleanFilename = `${filename.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_\-\s.]/g, '').trim() || sanitizedId}.${ext}`;

      const headers = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400'
      };

      if (response.headers['content-length']) {
        headers['Content-Length'] = response.headers['content-length'];
      }

      if (asDownload) {
        headers['Content-Disposition'] = `attachment; filename="${cleanFilename}"`;
      }

      res.writeHead(200, headers);

      response.data.on('error', (err) => {
        logger.error(`Stream pipe error for track ${sanitizedId}:`, err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Audio streaming interrupted' });
        } else {
          res.end();
        }
      });

      res.on('close', () => {
        if (response.data && response.data.destroy) {
          response.data.destroy();
        }
      });

      response.data.pipe(res);
      return;
    }

    // Fallback if directUrl failed
    logger.error(`No direct audio stream URL available for ${sanitizedId}`);
    return res.status(502).json({
      error: 'Audio stream temporarily unavailable for this track',
      videoId: sanitizedId
    });
  } catch (err) {
    logger.error(`Failed to pipe audio stream for ${sanitizedId}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to extract audio stream', details: err.message });
    }
  }
};
