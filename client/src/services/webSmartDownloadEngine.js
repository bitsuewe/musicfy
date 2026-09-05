import {
  openDB,
  downloadTrackOffline,
  getAllDownloadedTracks,
  removeTrackDownload,
  getOfflineSettings
} from './webOfflineStorage';

const CURATED_POPULAR_SEEDS = [
  {
    id: "fHI8X4OXluQ",
    title: "Blinding Lights",
    artistName: "The Weeknd",
    thumbnail: "https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg",
    durationSec: 200,
    category: "Synthwave"
  },
  {
    id: "34Na4j8AVgA",
    title: "Starboy",
    artistName: "The Weeknd",
    thumbnail: "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg",
    durationSec: 230,
    category: "Pop"
  },
  {
    id: "XXYlFuWEuKI",
    title: "Save Your Tears",
    artistName: "The Weeknd",
    thumbnail: "https://i.ytimg.com/vi/XXYlFuWEuKI/hqdefault.jpg",
    durationSec: 215,
    category: "Synthpop"
  },
  {
    id: "H5v3kku4y6Q",
    title: "As It Was",
    artistName: "Harry Styles",
    thumbnail: "https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg",
    durationSec: 167,
    category: "Pop"
  },
  {
    id: "TUVcZfQe-Kw",
    title: "Levitating",
    artistName: "Dua Lipa",
    thumbnail: "https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg",
    durationSec: 203,
    category: "Disco"
  },
  {
    id: "kTJczUoc26U",
    title: "STAY",
    artistName: "The Kid LAROI, Justin Bieber",
    thumbnail: "https://i.ytimg.com/vi/kTJczUoc26U/hqdefault.jpg",
    durationSec: 141,
    category: "Pop"
  },
  {
    id: "kJQP7kiw5Fk",
    title: "Despacito",
    artistName: "Luis Fonsi ft. Daddy Yankee",
    thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
    durationSec: 228,
    category: "Latin"
  },
  {
    id: "09R8_2nJtjg",
    title: "Sugar",
    artistName: "Maroon 5",
    thumbnail: "https://i.ytimg.com/vi/09R8_2nJtjg/hqdefault.jpg",
    durationSec: 235,
    category: "Pop"
  },
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artistName: "Ed Sheeran",
    thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    durationSec: 233,
    category: "Acoustic"
  },
  {
    id: "RgKAFK5djSk",
    title: "See You Again",
    artistName: "Wiz Khalifa ft. Charlie Puth",
    thumbnail: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg",
    durationSec: 230,
    category: "Hip-Hop"
  }
];

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

    const targetLimit = Math.max(5, Number(settings.smartDownloadLimit) || 50);

    // 1. Collect user listening affinity candidates
    const candidateMap = new Map();

    const ranked = allStats.map((item) => ({
      ...item,
      score: calculateAffinityScore(item)
    })).sort((a, b) => b.score - a.score);

    ranked.forEach((item) => {
      if (item.track && item.id) {
        candidateMap.set(String(item.id), item.track);
      }
    });

    // 2. If stats have fewer than targetLimit, pull from Liked Songs
    if (candidateMap.size < targetLimit) {
      try {
        const rawLikes = localStorage.getItem('spicify_user_liked_tracks');
        if (rawLikes) {
          const likedTracks = JSON.parse(rawLikes);
          if (Array.isArray(likedTracks)) {
            for (const t of likedTracks) {
              if (t && t.id && !candidateMap.has(String(t.id))) {
                candidateMap.set(String(t.id), t);
                if (candidateMap.size >= targetLimit) break;
              }
            }
          }
        }
      } catch (e) {}
    }

    // 3. Pull from Recent Songs
    if (candidateMap.size < targetLimit) {
      try {
        const rawRecents = localStorage.getItem('spicify_user_recent_tracks');
        if (rawRecents) {
          const recentTracks = JSON.parse(rawRecents);
          if (Array.isArray(recentTracks)) {
            for (const t of recentTracks) {
              if (t && t.id && !candidateMap.has(String(t.id))) {
                candidateMap.set(String(t.id), t);
                if (candidateMap.size >= targetLimit) break;
              }
            }
          }
        }
      } catch (e) {}
    }

    // 4. Seed with Curated Popular Tracks
    if (candidateMap.size < targetLimit) {
      for (const t of CURATED_POPULAR_SEEDS) {
        if (!candidateMap.has(String(t.id))) {
          candidateMap.set(String(t.id), t);
          if (candidateMap.size >= targetLimit) break;
        }
      }
    }

    const topCandidates = Array.from(candidateMap.values()).slice(0, targetLimit);
    const { allTracks, autoCachedTracks } = await getAllDownloadedTracks();
    const downloadedIds = new Set(allTracks.map((t) => String(t.id)));

    // Download missing top tracks in background
    for (const track of topCandidates) {
      const tid = String(track.id || track._id || track.videoId);
      if (!downloadedIds.has(tid)) {
        await downloadTrackOffline(track, false);
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
  } catch (e) {
    console.warn('Smart download sync error:', e);
  }
};
