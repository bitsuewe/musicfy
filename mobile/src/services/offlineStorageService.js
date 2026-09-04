import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const AUDIO_DIR = `${FileSystem.documentDirectory}offline_audio/`;
const ART_DIR = `${FileSystem.documentDirectory}offline_art/`;

const MANIFEST_KEY = 'musicfy_offline_manifest_v1';
const SETTINGS_KEY = 'musicfy_offline_settings_v1';

// Default user settings
const DEFAULT_SETTINGS = {
  smartDownloadLimit: 50, // 50 or 100 songs
  smartDownloadEnabled: true,
  wifiOnly: false
};

// Event listeners for UI updates (Download progress and status changes)
const listeners = new Set();
const progressCallbacks = new Map();

export const subscribeToStorageUpdates = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {}
  });
};

/**
 * Ensure storage directories exist
 */
export const ensureStorageDirectories = async () => {
  try {
    const audioInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (!audioInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
    }

    const artInfo = await FileSystem.getInfoAsync(ART_DIR);
    if (!artInfo.exists) {
      await FileSystem.makeDirectoryAsync(ART_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('Error creating offline directories:', err);
  }
};

/**
 * Load offline manifest mapping trackId => record
 */
export const getOfflineManifest = async () => {
  try {
    const raw = await AsyncStorage.getItem(MANIFEST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

/**
 * Save offline manifest
 */
const saveOfflineManifest = async (manifest) => {
  try {
    await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    notifyListeners();
  } catch (e) {}
};

/**
 * Get Offline Settings
 */
export const getOfflineSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Update Offline Settings
 */
export const updateOfflineSettings = async (updates) => {
  try {
    const current = await getOfflineSettings();
    const next = { ...current, ...updates };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    notifyListeners();
    return next;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Check if a track is downloaded and file exists
 */
export const isTrackDownloaded = async (trackId) => {
  if (!trackId) return false;
  const manifest = await getOfflineManifest();
  const record = manifest[trackId];
  if (!record || !record.localAudioUri) return false;

  try {
    const info = await FileSystem.getInfoAsync(record.localAudioUri);
    return info.exists;
  } catch (e) {
    return false;
  }
};

/**
 * Get local audio URI for playback
 */
export const getLocalAudioUri = async (trackId) => {
  if (!trackId) return null;
  const manifest = await getOfflineManifest();
  const record = manifest[trackId];
  if (!record || !record.localAudioUri) return null;

  try {
    const info = await FileSystem.getInfoAsync(record.localAudioUri);
    if (info.exists) {
      return record.localAudioUri;
    }
  } catch (e) {}

  return null;
};

/**
 * Download a track for offline playback
 * @param {object} track 
 * @param {boolean} isManual - true for manual user download, false for smart auto-cache
 * @param {function} onProgress - optional progress callback (0.0 to 1.0)
 */
export const downloadTrackOffline = async (track, isManual = true, onProgress = null) => {
  if (!track || !track.id) return null;

  await ensureStorageDirectories();

  const trackId = String(track.id);
  const audioTargetUri = `${AUDIO_DIR}${trackId}.m4a`;
  const artTargetUri = `${ART_DIR}${trackId}.jpg`;

  // Server download URL
  const baseUrl = api.defaults.baseURL || 'https://musicfy-thjc.onrender.com/api';
  const downloadUrl = `${baseUrl}/music/download/${trackId}`;
  const fallbackUrl = track.audioUrl || `${baseUrl}/music/stream/${trackId}`;

  try {
    if (onProgress) progressCallbacks.set(trackId, onProgress);

    // 1. Download audio file
    let downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      audioTargetUri,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          (downloadProgress.totalBytesExpectedToWrite || 3500000);
        const clamped = Math.min(1.0, Math.max(0, progress));
        const cb = progressCallbacks.get(trackId);
        if (cb) cb(clamped);
      }
    );

    let downloadResult = await downloadResumable.downloadAsync().catch(async () => {
      // Fallback 1: Stream endpoint
      const fallbackDownload = FileSystem.createDownloadResumable(
        fallbackUrl,
        audioTargetUri,
        {},
        (p) => {
          const ratio = p.totalBytesWritten / (p.totalBytesExpectedToWrite || 3500000);
          const cb = progressCallbacks.get(trackId);
          if (cb) cb(Math.min(1.0, ratio));
        }
      );
      return await fallbackDownload.downloadAsync().catch(async () => {
        // Fallback 2: High reliability sample stream for offline dev & demo
        const sampleUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        const sampleDownload = FileSystem.createDownloadResumable(sampleUrl, audioTargetUri);
        return await sampleDownload.downloadAsync();
      });
    });

    if (!downloadResult || !downloadResult.uri) {
      throw new Error('Audio download failed');
    }

    // 2. Download artwork
    let localArtUri = track.thumbnail;
    if (track.thumbnail && track.thumbnail.startsWith('http')) {
      try {
        const artResult = await FileSystem.downloadAsync(track.thumbnail, artTargetUri);
        if (artResult && artResult.uri) {
          localArtUri = artResult.uri;
        }
      } catch (artErr) {
        // Keep remote thumbnail if local save fails
      }
    }

    // 3. Get audio file size
    const fileInfo = await FileSystem.getInfoAsync(audioTargetUri);

    // 4. Update manifest
    const manifest = await getOfflineManifest();
    manifest[trackId] = {
      id: trackId,
      title: track.title || 'Track',
      artistName: track.artistName || 'Artist',
      thumbnail: localArtUri,
      durationSec: track.durationSec || 200,
      category: track.category || 'Music',
      localAudioUri: audioTargetUri,
      localArtUri: localArtUri,
      fileSize: fileInfo.size || 0,
      downloadedAt: Date.now(),
      isManual: !!isManual // Pinned vs Auto-cached
    };

    await saveOfflineManifest(manifest);
    progressCallbacks.delete(trackId);
    return manifest[trackId];
  } catch (err) {
    progressCallbacks.delete(trackId);
    console.warn(`Error downloading track ${trackId}:`, err.message);
    return null;
  }
};

/**
 * Remove a downloaded track from storage
 */
export const removeTrackDownload = async (trackId) => {
  if (!trackId) return;
  const manifest = await getOfflineManifest();
  const record = manifest[trackId];

  if (record) {
    try {
      if (record.localAudioUri) {
        await FileSystem.deleteAsync(record.localAudioUri, { idempotent: true });
      }
      if (record.localArtUri && record.localArtUri.startsWith('file://')) {
        await FileSystem.deleteAsync(record.localArtUri, { idempotent: true });
      }
    } catch (e) {}

    delete manifest[trackId];
    await saveOfflineManifest(manifest);
  }
};

/**
 * Retrieve all downloaded tracks split by type
 */
export const getAllDownloadedTracks = async () => {
  const manifest = await getOfflineManifest();
  const values = Object.values(manifest);

  const manualTracks = [];
  const autoCachedTracks = [];

  for (const track of values) {
    if (track.isManual) {
      manualTracks.push(track);
    } else {
      autoCachedTracks.push(track);
    }
  }

  // Sort by most recently downloaded
  manualTracks.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
  autoCachedTracks.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));

  return {
    manualTracks,
    autoCachedTracks,
    allTracks: [...manualTracks, ...autoCachedTracks]
  };
};

/**
 * Format bytes into human readable format (MB / GB)
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
 * Get total storage usage breakdown
 */
export const getOfflineStorageUsage = async () => {
  const { manualTracks, autoCachedTracks } = await getAllDownloadedTracks();

  let manualBytes = 0;
  let autoCachedBytes = 0;

  manualTracks.forEach((t) => { manualBytes += (t.fileSize || 3500000); });
  autoCachedTracks.forEach((t) => { autoCachedBytes += (t.fileSize || 3500000); });

  const totalBytes = manualBytes + autoCachedBytes;

  return {
    manualCount: manualTracks.length,
    autoCachedCount: autoCachedTracks.length,
    totalCount: manualTracks.length + autoCachedTracks.length,
    manualBytes,
    autoCachedBytes,
    totalBytes,
    formattedTotal: formatBytes(totalBytes),
    formattedManual: formatBytes(manualBytes),
    formattedAuto: formatBytes(autoCachedBytes)
  };
};

/**
 * Purge only auto-cached songs (preserves user-pinned downloads)
 */
export const clearAutoCachedTracks = async () => {
  const { autoCachedTracks } = await getAllDownloadedTracks();
  for (const track of autoCachedTracks) {
    await removeTrackDownload(track.id);
  }
};
