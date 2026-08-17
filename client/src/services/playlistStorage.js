import api from './api';

const PLAYLISTS_STORAGE_KEY = 'spicify_user_playlists';

export const getLocalPlaylists = () => {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveLocalPlaylists = (playlists) => {
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  } catch (e) {}
};

export const fetchAllPlaylists = async (user) => {
  const localList = getLocalPlaylists();
  let dbList = [];

  if (user) {
    try {
      const res = await api.get('/playlists');
      dbList = res.data.playlists || [];
    } catch (e) {}
  }

  // Merge and deduplicate
  const map = new Map();
  dbList.forEach(p => map.set(p.id, p));
  localList.forEach(p => {
    if (!map.has(p.id)) map.set(p.id, p);
  });

  return Array.from(map.values());
};

export const createNewPlaylist = async ({ title, description, isCollab = false, isPublic = true }, user) => {
  const newId = `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const localObj = {
    id: newId,
    title: title.trim(),
    description: description || 'Created on Musicfy',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    isPublic,
    isCollab,
    owner: { username: user?.username || 'You' },
    tracks: [],
    createdAt: new Date().toISOString()
  };

  // 1. Try DB first if user is logged in
  if (user) {
    try {
      const res = await api.post('/playlists', {
        title: title.trim(),
        description,
        isCollab,
        isPublic
      });
      if (res.data.playlist) {
        const saved = res.data.playlist;
        const currentLocals = getLocalPlaylists();
        saveLocalPlaylists([saved, ...currentLocals.filter(p => p.id !== saved.id)]);
        window.dispatchEvent(new CustomEvent('spicify_playlists_updated'));
        return saved;
      }
    } catch (e) {
      console.warn('Server playlist creation failed, saving locally:', e);
    }
  }

  // 2. Local fallback
  const currentLocals = getLocalPlaylists();
  const updated = [localObj, ...currentLocals];
  saveLocalPlaylists(updated);
  window.dispatchEvent(new CustomEvent('spicify_playlists_updated'));
  return localObj;
};

export const addTrackToSpecificPlaylist = async (playlistId, track, user) => {
  // 1. Try DB
  if (user && !playlistId.startsWith('pl_')) {
    try {
      await api.post(`/playlists/${playlistId}/tracks`, { track });
    } catch (e) {}
  }

  // 2. Update local state
  const locals = getLocalPlaylists();
  const updated = locals.map(p => {
    if (p.id === playlistId) {
      const currentTracks = p.tracks || [];
      const alreadyHas = currentTracks.some(item => (item.track?.id || item.id) === track.id);
      if (!alreadyHas) {
        return {
          ...p,
          tracks: [...currentTracks, { track }]
        };
      }
    }
    return p;
  });

  saveLocalPlaylists(updated);
  window.dispatchEvent(new CustomEvent('spicify_playlists_updated'));
};

export const removeTrackFromSpecificPlaylist = async (playlistId, trackId, user) => {
  if (user && !playlistId.startsWith('pl_')) {
    try {
      await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
    } catch (e) {}
  }

  const locals = getLocalPlaylists();
  const updated = locals.map(p => {
    if (p.id === playlistId) {
      return {
        ...p,
        tracks: (p.tracks || []).filter(item => (item.track?.id || item.id) !== trackId)
      };
    }
    return p;
  });

  saveLocalPlaylists(updated);
  window.dispatchEvent(new CustomEvent('spicify_playlists_updated'));
};
