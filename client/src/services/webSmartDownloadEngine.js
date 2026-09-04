import {
  downloadTrackOffline,
  getAllDownloadedTracks,
  removeTrackDownload,
  getOfflineSettings
} from './webOfflineStorage';

const DB_NAME = 'musicfy_offline_db';

const openStatsStore = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const recordWebTrackListening = async (track, completed = false) => {
  if (!track || !track.id) return;
  const tid = String(track.id);

  try {
    const db = await openStatsStore();
    const current = await new Promise((resolve) => {
      const tx = db.transaction(['stats'], 'readonly');
      const req = tx.objectStore('stats').get(tid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    const next = current || {
      id: tid,
      track: {
        id: tid,
        title: track.title || 'Track',
        artistName: track.artistName || 'Artist',
        thumbnail: track.thumbnail || '',
        durationSec: track.durationSec || 200,
        category: track.category || 'Music'
      },
      playCount: 0,
      completionCount: 0,
      lastPlayedAt: Date.now(),
      liked: false
    };

    next.playCount = (next.playCount || 0) + 1;
    if (completed) next.completionCount = (next.completionCount || 0) + 1;
    next.lastPlayedAt = Date.now();

    await new Promise((resolve, reject) => {
      const tx = db.transaction(['stats'], 'readwrite');
      tx.objectStore('stats').put(next);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    triggerSmartSyncDebounced();
  } catch (e) {}
};

export const recordWebTrackLike = async (track, isLiked) => {
  if (!track || !track.id) return;
  const tid = String(track.id);

  try {
    const db = await openStatsStore();
    const current = await new Promise((resolve) => {
      const tx = db.transaction(['stats'], 'readonly');
      const req = tx.objectStore('stats').get(tid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    const next = current || {
      id: tid,
      track,
      playCount: 1,
      completionCount: 0,
      lastPlayedAt: Date.now(),
      liked: false
    };
    next.liked = !!isLiked;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(['stats'], 'readwrite');
      tx.objectStore('stats').put(next);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    triggerSmartSyncDebounced();
  } catch (e) {}
};

const calculateAffinityScore = (item) => {
  const daysSince = Math.max(0, (Date.now() - (item.lastPlayedAt || Date.now())) / (1000 * 60 * 60 * 24));
  const playScore = (item.playCount || 0) * 3.0;
  const completionScore = (item.completionCount || 0) * 5.0;
  const likeScore = item.liked ? 15.0 : 0.0;
  const recencyPenalty = daysSince * 1.2;

  return playScore + completionScore + likeScore - recencyPenalty;
};

let syncTimeout = null;
const triggerSmartSyncDebounced = () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncWebSmartDownloads().catch(() => {});
  }, 4000);
};

export const syncWebSmartDownloads = async () => {
  const settings = await getOfflineSettings();
  if (!settings.smartDownloadEnabled) return;

  try {
    const db = await openStatsStore();
    const allStats = await new Promise((resolve) => {
      const tx = db.transaction(['stats'], 'readonly');
      const req = tx.objectStore('stats').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const targetLimit = Number(settings.smartDownloadLimit) || 50;

    const ranked = allStats.map((item) => ({
      ...item,
      score: calculateAffinityScore(item)
    })).sort((a, b) => b.score - a.score);

    const topCandidates = ranked.slice(0, targetLimit);
    const { allTracks, autoCachedTracks } = await getAllDownloadedTracks();
    const downloadedIds = new Set(allTracks.map((t) => t.id));

    // Download missing top tracks
    for (const item of topCandidates) {
      if (!downloadedIds.has(item.id)) {
        await downloadTrackOffline(item.track, false);
      }
    }

    // Evict lowest scoring auto-cached tracks if over limit
    if (autoCachedTracks.length > targetLimit) {
      const scored = autoCachedTracks.map((t) => {
        const match = allStats.find((s) => s.id === t.id);
        return {
          id: t.id,
          score: match ? calculateAffinityScore(match) : -999
        };
      }).sort((a, b) => a.score - b.score);

      const toEvict = scored.slice(0, autoCachedTracks.length - targetLimit);
      for (const evict of toEvict) {
        await removeTrackDownload(evict.id);
      }
    }
  } catch (e) {}
};
