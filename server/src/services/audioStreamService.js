import { Innertube, UniversalCache } from 'youtubei.js';
import { Readable } from 'stream';
import { logger } from '../utils/logger.js';

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
 * Stream track audio directly to response
 * @param {string} videoId 
 * @param {import('express').Response} res 
 * @param {boolean} asDownload 
 * @param {string} filename 
 */
export const pipeAudioStream = async (videoId, res, asDownload = false, filename = 'track.m4a') => {
  try {
    const yt = await getInnertube();

    // Fetch video info to get title or format details if needed
    const info = await yt.getInfo(videoId).catch(() => null);
    const title = info?.basic_info?.title || filename.replace(/\.m4a$/, '');
    const cleanFilename = `${title.replace(/[^a-zA-Z0-9_\-\s.]/g, '').trim() || 'track'}.m4a`;

    // Download audio stream (m4a/mp4 container)
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best',
      format: 'mp4'
    });

    if (!stream) {
      return res.status(404).json({ error: 'Audio stream not found for video' });
    }

    const headers = {
      'Content-Type': 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400'
    };

    if (asDownload) {
      headers['Content-Disposition'] = `attachment; filename="${cleanFilename}"`;
    }

    res.writeHead(200, headers);

    const nodeStream = Readable.fromWeb(stream);
    nodeStream.on('error', (err) => {
      logger.error(`Stream error for track ${videoId}:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Audio streaming interrupted' });
      } else {
        res.end();
      }
    });

    res.on('close', () => {
      if (nodeStream.destroy) nodeStream.destroy();
    });

    nodeStream.pipe(res);
  } catch (err) {
    logger.error(`Failed to pipe audio stream for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to extract audio stream', details: err.message });
    }
  }
};
