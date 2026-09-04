import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOfflineSettings,
  getOfflineManifest,
  downloadTrackOffline,
  removeTrackDownload,
  getAllDownloadedTracks
} from './offlineStorageService';

const STATS_KEY = 'musicfy_listening_stats_v1';

let isSyncing = false;

/**
 * Get listening stats dictionary { trackId => { track, playCount, completions, lastPlayedAt, liked } }
 */
export const getListeningStats = async () => {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

/**
 * Save listening stats
 */
const saveListeningStats = async (stats) => {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
};

/**
 * Record a listening event to calculate affinity scores
 */
export const recordTrackListening = async (track, completed = false) => {
  if (!track || !track.id) return;
  const trackId = String(track.id);

  try {
    const stats = await getListeningStats();
    const current = stats[trackId] || {
      track: {
        id: trackId,
        title: track.title,
        artistName: track.artistName,
        thumbnail: track.thumbnail,
        durationSec: track.durationSec || 200,
        category: track.category || 'Music'
      },
      playCount: 0,
      completionCount: 0,
      lastPlayedAt: Date.now(),
      liked: false
    };

    current.playCount = (current.playCount || 0) + 1;
    if (completed) {
      current.completionCount = (current.completionCount || 0) + 1;
    }
    current.lastPlayedAt = Date.now();
    current.track = {
      id: trackId,
      title: track.title,
      artistName: track.artistName,
      thumbnail: track.thumbnail,
      durationSec: track.durationSec || 200,
      category: track.category || 'Music'
    };

    stats[trackId] = current;
    await saveListeningStats(stats);

    // Opportunistically run smart sync in the background
    triggerSmartSyncDebounced();
  } catch (err) {
    console.warn('Error recording listening stats:', err);
  }
};

/**
 * Update like status in affinity stats
 */
export const recordTrackLikeStatus = async (track, isLiked) => {
  if (!track || !track.id) return;
  const trackId = String(track.id);

  try {
    const stats = await getListeningStats();
    if (stats[trackId]) {
      stats[trackId].liked = !!isLiked;
    } else {
      stats[trackId] = {
        track,
        playCount: 1,
        completionCount: 0,
        lastPlayedAt: Date.now(),
        liked: !!isLiked
      };
    }
    await saveListeningStats(stats);
    triggerSmartSyncDebounced();
  } catch (e) {}
};

/**
 * Calculate Affinity Score for a track
 */
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
    syncSmartDownloads().catch(() => {});
  }, 4000); // 4 seconds debounce
};

/**
 * Main Smart Auto-Download Synchronization Engine
 * Automatically downloads and rotates the user's top 50 (or 100) most listened songs
 */
export const syncSmartDownloads = async () => {
  if (isSyncing) return;

  const settings = await getOfflineSettings();
  if (!settings.smartDownloadEnabled) return;

  isSyncing = true;
  try {
    const targetLimit = Number(settings.smartDownloadLimit) || 50;
    const stats = await getListeningStats();
    const manifest = await getOfflineManifest();

    // 1. Sort all listened tracks by Affinity Score
    const rankedCandidates = Object.values(stats)
      .map((item) => ({
        ...item,
        score: calculateAffinityScore(item)
      }))
      .sort((a, b) => b.score - a.score);

    // 2. Select top N candidates (up to targetLimit)
    const topCandidates = rankedCandidates.slice(0, targetLimit);

    // 3. Download any top candidate not yet in storage
    for (const item of topCandidates) {
      const trackId = item.track.id;
      const existing = manifest[trackId];

      if (!existing) {
        // Automatically download into Smart Cache (isManual = false)
        await downloadTrackOffline(item.track, false);
      }
    }

    // 4. Eviction: Check if auto-cached count exceeds targetLimit
    const { autoCachedTracks } = await getAllDownloadedTracks();
    if (autoCachedTracks.length > targetLimit) {
      // Sort auto-cached tracks by score ascending (lowest score evicted first)
      const scoredAutoTracks = autoCachedTracks.map((t) => {
        const item = stats[t.id];
        return {
          id: t.id,
          score: item ? calculateAffinityScore(item) : -999
        };
      });

      scoredAutoTracks.sort((a, b) => a.score - b.score);

      const toEvict = scoredAutoTracks.slice(0, autoCachedTracks.length - targetLimit);
      for (const evictItem of toEvict) {
        await removeTrackDownload(evictItem.id);
      }
    }
  } catch (err) {
    console.warn('Smart download sync notice:', err.message);
  } finally {
    isSyncing = false;
  }
};
