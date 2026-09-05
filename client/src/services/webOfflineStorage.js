import api from './api';

const DB_NAME = 'musicfy_offline_db';
const DB_VERSION = 3; // Bumped to 3 to purge legacy fake audio blobs

let dbPromise = null;

export const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('manifest')) {
        db.createObjectStore('manifest', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('stats')) {
        db.createObjectStore('stats', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
      // Automatically purge previous fake/dummy audio blobs in the background
      purgeLegacyDummyAudio(db).catch(() => {});
    };
    request.onerror = (e) => {
      dbPromise = null;
      reject(request.error || e);
    };
  });

  return dbPromise;
};

// UI storage event listeners
const listeners = new Set();
export const subscribeToStorageUpdates = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const notifyListeners = () => {
  listeners.forEach((cb) => {
    try { cb(); } catch (e) {}
  });
};

/**
 * Automatically purge legacy synthetic placeholder audio blobs (< 200KB or audio/wav)
 * from IndexedDB so user only plays genuine audio files.
 */
export const purgeLegacyDummyAudio = async (passedDb = null) => {
  try {
    const db = passedDb || await openDB();
    const audioRecords = await new Promise((resolve) => {
      const tx = db.transaction(['audio'], 'readonly');
      const req = tx.objectStore('audio').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const record of audioRecords) {
      const isWav = record.type === 'audio/wav' || record.blob?.type === 'audio/wav';
      const isTooSmall = (record.size || record.blob?.size || 0) < 200000;
      if (isWav || isTooSmall) {
        await removeTrackDownload(record.id);
      }
    }
  } catch (e) {}
};

/**
 * Check if a track is downloaded in IndexedDB
 */
export const isTrackDownloaded = async (trackId) => {
  if (!trackId) return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['manifest'], 'readonly');
      const store = tx.objectStore('manifest');
      const req = store.get(String(trackId));
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
};

/**
 * Get offline audio blob object URL for playback
 */
const activeObjectUrls = new Map();

export const getOfflineAudioUrl = async (trackId) => {
  if (!trackId) return null;
  const tid = String(trackId);
  try {
    const db = await openDB();
    const blobRecord = await new Promise((resolve) => {
      const tx = db.transaction(['audio'], 'readonly');
      const store = tx.objectStore('audio');
      const req = store.get(tid);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    if (!blobRecord || !blobRecord.blob) return null;

    if (activeObjectUrls.has(tid)) {
      return activeObjectUrls.get(tid);
    }

    const objectUrl = URL.createObjectURL(blobRecord.blob);
    activeObjectUrls.set(tid, objectUrl);
    return objectUrl;
  } catch (e) {
    return null;
  }
};

/**
 * Download a track for offline playback into IndexedDB
 * Authentic Stream Strategy: Downloads real audio stream directly from backend
 * Never substitutes dummy soundtracks or synthetic audio!
 */
export const downloadTrackOffline = async (track, isManual = true, onProgress = null) => {
  const trackId = String(track?.id || track?._id || track?.trackId || track?.videoId || '');
  if (!trackId) return false;

  if (onProgress) onProgress(0.15);

  let blob = null;

  // 1. Build endpoint candidate list dynamically
  const apiBase = (api.defaults?.baseURL || '').replace(/\/+$/, '');
  const candidateEndpoints = [
    `${apiBase}/music/download/${trackId}`,
    `${apiBase}/music/stream/${trackId}`,
    `http://localhost:5000/api/music/download/${trackId}`,
    `http://127.0.0.1:5000/api/music/download/${trackId}`,
    `https://musicfy-thjc.onrender.com/api/music/download/${trackId}`
  ];
  const uniqueEndpoints = [...new Set(candidateEndpoints.filter(Boolean))];

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    for (const url of uniqueEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for full real audio download
        const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
        clearTimeout(timeoutId);
        if (res.ok) {
          const resBlob = await res.blob();
          // Ensure blob is authentic audio and not an error response or small dummy
          if (resBlob && resBlob.size > 50000 && !resBlob.type.includes('json') && !resBlob.type.includes('html')) {
            blob = resBlob;
            break;
          }
        }
      } catch (e) {
        // Try next endpoint
      }
    }
  }

  if (onProgress) onProgress(0.75);

  // 2. If real stream could not be fetched, fail honestly!
  // NEVER generate dummy/piano synthesized audio loops.
  if (!blob || blob.size < 50000) {
    console.warn(`Could not acquire authentic audio stream for track ${trackId}`);
    return false;
  }

  if (onProgress) onProgress(0.9);

  // 3. Save real audio stream to IndexedDB
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['audio', 'manifest'], 'readwrite');
      const audioStore = tx.objectStore('audio');
      const manifestStore = tx.objectStore('manifest');

      audioStore.put({
        id: trackId,
        blob: blob,
        size: blob.size,
        type: blob.type || 'audio/webm'
      });

      manifestStore.put({
        id: trackId,
        title: track.title || 'Track',
        artistName: track.artistName || 'Artist',
        thumbnail: track.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg',
        durationSec: track.durationSec || 200,
        category: track.category || 'Music',
        fileSize: blob.size,
        downloadedAt: Date.now(),
        isManual: !!isManual
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (onProgress) onProgress(1.0);
    notifyListeners();
    return true;
  } catch (err) {
    console.error('Save to IndexedDB error:', err);
    return false;
  }
};

/**
 * Remove a track download from IndexedDB
 */
export const removeTrackDownload = async (trackId) => {
  if (!trackId) return;
  const tid = String(trackId);

  if (activeObjectUrls.has(tid)) {
    try {
      URL.revokeObjectURL(activeObjectUrls.get(tid));
    } catch (e) {}
    activeObjectUrls.delete(tid);
  }

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['audio', 'manifest'], 'readwrite');
      tx.objectStore('audio').delete(tid);
      tx.objectStore('manifest').delete(tid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyListeners();
  } catch (e) {}
};

/**
 * Retrieve all downloaded tracks from IndexedDB
 */
export const getAllDownloadedTracks = async () => {
  try {
    const db = await openDB();
    const manifestList = await new Promise((resolve) => {
      const tx = db.transaction(['manifest'], 'readonly');
      const store = tx.objectStore('manifest');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const manualTracks = [];
    const autoCachedTracks = [];

    for (const track of manifestList) {
      if (track.isManual) manualTracks.push(track);
      else autoCachedTracks.push(track);
    }

    manualTracks.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
    autoCachedTracks.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));

    return {
      manualTracks,
      autoCachedTracks,
      allTracks: [...manualTracks, ...autoCachedTracks]
    };
  } catch (e) {
    return { manualTracks: [], autoCachedTracks: [], allTracks: [] };
  }
};

/**
 * Format bytes into human-readable string
 */
export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
};

/**
 * Get offline storage usage
 */
export const getOfflineStorageUsage = async () => {
  const { manualTracks, autoCachedTracks, allTracks } = await getAllDownloadedTracks();

  let manualBytes = 0;
  let autoCachedBytes = 0;

  manualTracks.forEach((t) => { manualBytes += (t.fileSize || 3500000); });
  autoCachedTracks.forEach((t) => { autoCachedBytes += (t.fileSize || 3500000); });

  const totalBytes = manualBytes + autoCachedBytes;

  return {
    manualCount: manualTracks.length,
    autoCachedCount: autoCachedTracks.length,
    totalCount: allTracks.length,
    manualBytes,
    autoCachedBytes,
    totalBytes,
    formattedTotal: formatBytes(totalBytes),
    formattedManual: formatBytes(manualBytes),
    formattedAuto: formatBytes(autoCachedBytes)
  };
};

/**
 * Purge only auto-cached songs
 */
export const clearAutoCachedTracks = async () => {
  const { autoCachedTracks } = await getAllDownloadedTracks();
  for (const t of autoCachedTracks) {
    await removeTrackDownload(t.id);
  }
};

/**
 * Read and write offline settings
 */
export const getOfflineSettings = async () => {
  const defaults = { smartDownloadLimit: 50, smartDownloadEnabled: true };
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['settings'], 'readonly');
      const req = tx.objectStore('settings').get('offline_settings');
      req.onsuccess = () => resolve(req.result ? req.result.value : defaults);
      req.onerror = () => resolve(defaults);
    });
  } catch (e) {
    return defaults;
  }
};

export const updateOfflineSettings = async (updates) => {
  const current = await getOfflineSettings();
  const next = { ...current, ...updates };
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['settings'], 'readwrite');
      tx.objectStore('settings').put({ key: 'offline_settings', value: next });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyListeners();
  } catch (e) {}
  return next;
};
