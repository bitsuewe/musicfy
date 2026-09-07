import { prisma, safeDbQuery } from '../config/db.js';
import {
  getPersistentUserPlaylists,
  createPersistentPlaylist,
  getPersistentPlaylistById,
  addTrackToPersistentPlaylist,
  removeTrackFromPersistentPlaylist
} from '../services/persistentUserDataStore.js';

export const getPlaylists = async (req, res) => {
  try {
    const userId = req.user?.id;
    const persistentPlaylists = getPersistentUserPlaylists(userId);

    const dbPlaylists = await safeDbQuery(
      (p) =>
        p.playlist.findMany({
          where: userId
            ? {
                OR: [
                  { ownerId: userId },
                  { collaborators: { some: { userId } } },
                  { isPublic: true }
                ]
              }
            : { isPublic: true },
          include: {
            owner: { select: { id: true, username: true, avatar: true } },
            tracks: {
              include: { track: true },
              orderBy: { position: 'asc' }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }),
      null,
      2000
    );

    if (Array.isArray(dbPlaylists) && dbPlaylists.length > 0) {
      const map = new Map();
      dbPlaylists.forEach((p) => map.set(p.id, p));
      persistentPlaylists.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });
      return res.json({ playlists: Array.from(map.values()) });
    }

    return res.json({ playlists: persistentPlaylists });
  } catch (err) {
    console.error('Get playlists error:', err);
    return res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

export const createPlaylist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, isPublic, isCollab, coverUrl } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Playlist title is required' });
    }

    // 1. Create in persistent store immediately
    const playlist = createPersistentPlaylist(
      userId,
      { title, description, isPublic, isCollab, coverUrl },
      req.user
    );

    // 2. Sync to Prisma in background
    safeDbQuery(
      (p) =>
        p.playlist.create({
          data: {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            isPublic: playlist.isPublic,
            isCollab: playlist.isCollab,
            ownerId: userId
          }
        }),
      null,
      2000
    ).catch(() => {});

    return res.status(201).json({ playlist });
  } catch (err) {
    console.error('Create playlist error:', err);
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
};

export const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    let playlist = getPersistentPlaylistById(id);

    if (!playlist) {
      playlist = await safeDbQuery(
        (p) =>
          p.playlist.findUnique({
            where: { id },
            include: {
              owner: { select: { id: true, username: true, avatar: true } },
              tracks: {
                include: { track: true },
                orderBy: { position: 'asc' }
              }
            }
          }),
        null,
        2000
      );
    }

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    return res.json({ playlist });
  } catch (err) {
    console.error('Get playlist by id error:', err);
    return res.status(500).json({ error: 'Failed to fetch playlist' });
  }
};

export const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, coverUrl, isPublic } = req.body;

    const playlist = getPersistentPlaylistById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this playlist' });
    }

    if (title) playlist.title = title.trim();
    if (description !== undefined) playlist.description = description;
    if (coverUrl) playlist.coverUrl = coverUrl;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    playlist.updatedAt = new Date().toISOString();

    safeDbQuery(
      (p) =>
        p.playlist.update({
          where: { id },
          data: {
            title: playlist.title,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            isPublic: playlist.isPublic
          }
        }),
      null,
      2000
    ).catch(() => {});

    return res.json({ playlist });
  } catch (err) {
    console.error('Update playlist error:', err);
    return res.status(500).json({ error: 'Failed to update playlist' });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = getPersistentPlaylistById(id);

    if (playlist && playlist.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this playlist' });
    }

    safeDbQuery((p) => p.playlist.delete({ where: { id } }), null, 2000).catch(() => {});

    return res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) {
    console.error('Delete playlist error:', err);
    return res.status(500).json({ error: 'Failed to delete playlist' });
  }
};

export const addTrackToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackId, track } = req.body;

    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }

    const playlist = addTrackToPersistentPlaylist(id, track || { id: trackId }, req.user.id);

    // Sync to DB in background
    safeDbQuery(async (p) => {
      await p.track.upsert({
        where: { id: trackId },
        update: {},
        create: {
          id: trackId,
          title: track?.title || 'Unknown Track',
          artistName: track?.artistName || 'Unknown Artist',
          thumbnail: track?.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`,
          durationSec: track?.durationSec || 200,
          category: track?.category || 'Music'
        }
      });
      await p.playlistTrack.create({
        data: {
          playlistId: id,
          trackId,
          position: (playlist?.tracks?.length || 1) - 1,
          addedById: req.user.id
        }
      });
    }, null, 2000).catch(() => {});

    return res.json({ success: true, playlist });
  } catch (err) {
    console.error('Add track error:', err);
    return res.status(500).json({ error: 'Failed to add track to playlist' });
  }
};

export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const { id, trackId } = req.params;
    const playlist = removeTrackFromPersistentPlaylist(id, trackId);

    safeDbQuery(
      (p) =>
        p.playlistTrack.deleteMany({
          where: { playlistId: id, trackId }
        }),
      null,
      2000
    ).catch(() => {});

    return res.json({ success: true, playlist });
  } catch (err) {
    console.error('Remove track error:', err);
    return res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
};
