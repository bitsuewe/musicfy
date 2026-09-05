import {
  openDB,
  downloadTrackOffline,
  getAllDownloadedTracks,
  removeTrackDownload,
  getOfflineSettings
} from './webOfflineStorage';



export const recordWebTrackListening = async (track, completed = false) => {
  const trackId = track?.id || track?._id || track?.trackId || track?.videoId;
  if (!trackId) return;
  const tid = String(trackId);

  try {
    const db = await openDB();
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
  const trackId = track?.id || track?._id || track?.trackId || track?.videoId;
  if (!trackId) return;
  const tid = String(trackId);

  try {
    const db = await openDB();
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
    const db = await openDB();
    const allStats = await new Promise((resolve) => {
      const tx = db.transaction(['stats'], 'readonly');
      const req = tx.objectStore('stats').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const { allTracks, autoCachedTracks } = await getAllDownloadedTracks();

    // Clean up any previously auto-cached tracks that user never actually listened to (e.g. legacy pop seeds)
    if (autoCachedTracks.length > 0) {
      for (const autoTrack of autoCachedTracks) {
        const match = allStats.find((s) => String(s.id) === String(autoTrack.id));
        if (!match || (Number(match.playCount) || 0) < 1) {
          await removeTrackDownload(autoTrack.id);
        }
      }
    }

    // Do NOT auto-download on first login or for brand new accounts with no listening history
    // Require user to have listened to multiple tracks first
    if (!allStats || allStats.length < 3) {
      return;
    }

    // Only qualify tracks that the user actually listens to often:
    // - Played at least 2 times, OR
    // - Liked and played at least once, OR
    // - Completed full playback at least twice
    const frequentItems = allStats.filter((item) => {
      const plays = Number(item.playCount) || 0;
      const completions = Number(item.completionCount) || 0;
      const isLiked = Boolean(item.liked);
      return plays >= 2 || (isLiked && plays >= 1) || completions >= 2;
    });

    if (frequentItems.length === 0) {
      return;
    }

    const targetLimit = Math.max(5, Number(settings.smartDownloadLimit) || 20);

    // Rank candidate tracks by true affinity score
    const ranked = frequentItems
      .map((item) => ({
        ...item,
        score: calculateAffinityScore(item)
      }))
      .sort((a, b) => b.score - a.score);

    const topCandidates = ranked
      .filter((item) => item.track && item.id)
      .slice(0, targetLimit)
      .map((item) => item.track);

    const downloadedIds = new Set(allTracks.map((t) => String(t.id)));

    // Download genuine top affinity songs silently in background
    for (const track of topCandidates) {
      const tid = String(track.id || track._id || track.videoId);
      if (!downloadedIds.has(tid)) {
        await downloadTrackOffline(track, false);
      }
    }

    // Evict lowest scoring auto-cached tracks if over user's limit
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
  } catch (e) {
    console.warn('Smart download sync error:', e);
  }
};

