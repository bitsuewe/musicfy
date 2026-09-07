import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findPersistentUser } from './persistentUserStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

const LIKES_FILE = path.join(DATA_DIR, 'likes.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory data collections
let memoryLikes = [];
let memoryHistory = [];
let memoryPlaylists = [];

const loadJson = (filePath, fallback = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : fallback;
    }
  } catch (e) {
    console.warn(`Could not read ${path.basename(filePath)}:`, e.message);
  }
  return fallback;
};

const saveJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Failed to write ${path.basename(filePath)}:`, e.message);
  }
};

// Initial hydration from disk
export const loadUserDataFromDisk = () => {
  memoryLikes = loadJson(LIKES_FILE, []);
  memoryHistory = loadJson(HISTORY_FILE, []);
  memoryPlaylists = loadJson(PLAYLISTS_FILE, []);
};

loadUserDataFromDisk();

// ================= LIKES MANAGEMENT =================

export const togglePersistentLike = (userId, trackId, trackData) => {
  if (!userId || !trackId) return { liked: false };
  loadUserDataFromDisk();

  const idx = memoryLikes.findIndex((l) => l.userId === userId && l.trackId === trackId);

  if (idx >= 0) {
    // Unlike
    memoryLikes.splice(idx, 1);
    saveJson(LIKES_FILE, memoryLikes);
    return { liked: false };
  } else {
    // Like
    const newLike = {
      id: `like_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      trackId,
      track: trackData || { id: trackId, title: 'Unknown Track', artistName: 'Unknown Artist' },
      createdAt: new Date().toISOString()
    };
    memoryLikes.unshift(newLike);
    saveJson(LIKES_FILE, memoryLikes);
    return { liked: true };
  }
};

export const getPersistentUserLikes = (userId) => {
  if (!userId) return [];
  loadUserDataFromDisk();
  return memoryLikes.filter((l) => l.userId === userId);
};

export const isPersistentTrackLiked = (userId, trackId) => {
  if (!userId || !trackId) return false;
  return memoryLikes.some((l) => l.userId === userId && l.trackId === trackId);
};

// ================= HISTORY MANAGEMENT =================

export const addPersistentHistory = (userId, trackId, trackData, durationSec = 0, completed = false) => {
  if (!userId || !trackId) return;
  loadUserDataFromDisk();

  // Deduplicate previous recent duplicate for cleaner feed
  memoryHistory = memoryHistory.filter((h) => !(h.userId === userId && h.trackId === trackId));

  const newHist = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId,
    trackId,
    track: trackData || { id: trackId, title: 'Unknown Track', artistName: 'Unknown Artist' },
    durationSec: Number(durationSec) || 200,
    completed: !!completed,
    playedAt: new Date().toISOString()
  };

  memoryHistory.unshift(newHist);

  // Keep max 100 history items per user
  const userCount = memoryHistory.filter((h) => h.userId === userId).length;
  if (userCount > 100) {
    let kept = 0;
    memoryHistory = memoryHistory.filter((h) => {
      if (h.userId === userId) {
        kept++;
        return kept <= 100;
      }
      return true;
    });
  }

  saveJson(HISTORY_FILE, memoryHistory);
};

export const getPersistentUserHistory = (userId, limit = 30) => {
  if (!userId) return [];
  loadUserDataFromDisk();
  return memoryHistory.filter((h) => h.userId === userId).slice(0, limit);
};

// ================= PLAYLISTS MANAGEMENT =================

export const getPersistentUserPlaylists = (userId) => {
  loadUserDataFromDisk();
  if (!userId) {
    return memoryPlaylists.filter((p) => p.isPublic !== false);
  }
  return memoryPlaylists.filter((p) => p.ownerId === userId || p.isPublic !== false);
};

export const createPersistentPlaylist = (userId, { title, description, isPublic, isCollab, coverUrl }, ownerInfo) => {
  loadUserDataFromDisk();
  const newPlaylist = {
    id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: (title || 'New Playlist').trim(),
    description: description || 'Created on Musicfy',
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    isPublic: isPublic !== false,
    isCollab: isCollab === true,
    ownerId: userId,
    owner: {
      id: userId,
      username: ownerInfo?.username || 'user',
      avatarUrl: ownerInfo?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${ownerInfo?.username || 'user'}`
    },
    tracks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memoryPlaylists.unshift(newPlaylist);
  saveJson(PLAYLISTS_FILE, memoryPlaylists);
  return newPlaylist;
};

export const getPersistentPlaylistById = (playlistId) => {
  loadUserDataFromDisk();
  return memoryPlaylists.find((p) => p.id === playlistId) || null;
};

export const addTrackToPersistentPlaylist = (playlistId, track, addedById) => {
  loadUserDataFromDisk();
  const pl = memoryPlaylists.find((p) => p.id === playlistId);
  if (!pl) return null;

  if (!pl.tracks) pl.tracks = [];
  // Avoid exact duplicates in playlist if already present
  if (!pl.tracks.some((t) => (t.track?.id || t.id) === (track.id || track.trackId))) {
    pl.tracks.push({
      id: `plt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      playlistId,
      trackId: track.id,
      position: pl.tracks.length,
      addedById: addedById || pl.ownerId,
      track: track,
      addedAt: new Date().toISOString()
    });
    pl.updatedAt = new Date().toISOString();
    saveJson(PLAYLISTS_FILE, memoryPlaylists);
  }
  return pl;
};

export const removeTrackFromPersistentPlaylist = (playlistId, trackId) => {
  loadUserDataFromDisk();
  const pl = memoryPlaylists.find((p) => p.id === playlistId);
  if (!pl || !pl.tracks) return null;

  pl.tracks = pl.tracks.filter((t) => (t.track?.id || t.trackId || t.id) !== trackId);
  pl.updatedAt = new Date().toISOString();
  saveJson(PLAYLISTS_FILE, memoryPlaylists);
  return pl;
};

// ================= PROFILE DATA MANAGEMENT =================

export const getPersistentUserProfileData = (identifier) => {
  if (!identifier) return null;
  loadUserDataFromDisk();

  const user = findPersistentUser(identifier);
  if (!user) return null;

  const userLikes = memoryLikes.filter((l) => l.userId === user.id);
  const userHistory = memoryHistory.filter((h) => h.userId === user.id);
  const userPlaylists = memoryPlaylists.filter((p) => p.ownerId === user.id);

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
    bio: user.bio || 'Musicfy music lover',
    createdAt: user.createdAt,
    playlists: userPlaylists,
    likes: userLikes,
    history: userHistory,
    _count: {
      playlists: userPlaylists.length,
      likes: userLikes.length,
      history: userHistory.length,
      followers: 0,
      following: 0
    }
  };
};
