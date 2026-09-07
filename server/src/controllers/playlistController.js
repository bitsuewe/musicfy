import { prisma } from '../config/db.js';

export const getPlaylists = async (req, res) => {
  try {
    const userId = req.user?.id;

    const playlists = await prisma.playlist.findMany({
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
    });

    return res.json({ playlists: playlists || [] });
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

    const playlist = await prisma.playlist.create({
      data: {
        title: title.trim(),
        description: description || '',
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80',
        isPublic: isPublic !== false,
        isCollab: isCollab === true,
        ownerId: userId
      },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: { include: { track: true } }
      }
    });

    return res.status(201).json({ playlist });
  } catch (err) {
    console.error('Create playlist error:', err);
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
};

export const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' }
        }
      }
    });

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

    const existing = await prisma.playlist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this playlist' });
    }

    const updated = await prisma.playlist.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        coverUrl: coverUrl || undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined
      },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: { include: { track: true }, orderBy: { position: 'asc' } }
      }
    });

    return res.json({ playlist: updated });
  } catch (err) {
    console.error('Update playlist error:', err);
    return res.status(500).json({ error: 'Failed to update playlist' });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.playlist.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this playlist' });
    }

    await prisma.playlist.delete({ where: { id } });

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

    // Ensure track exists in Supabase Track table
    await prisma.track.upsert({
      where: { id: trackId },
      update: {
        title: track?.title || 'Unknown Track',
        artistName: track?.artistName || 'Unknown Artist',
        thumbnail: track?.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`,
        durationSec: track?.durationSec || 200,
        category: track?.category || 'Music'
      },
      create: {
        id: trackId,
        title: track?.title || 'Unknown Track',
        artistName: track?.artistName || 'Unknown Artist',
        thumbnail: track?.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`,
        durationSec: track?.durationSec || 200,
        category: track?.category || 'Music'
      }
    });

    const trackCount = await prisma.playlistTrack.count({ where: { playlistId: id } });

    await prisma.playlistTrack.create({
      data: {
        playlistId: id,
        trackId,
        position: trackCount,
        addedById: req.user.id
      }
    });

    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: { include: { track: true }, orderBy: { position: 'asc' } }
      }
    });

    return res.json({ success: true, playlist: updatedPlaylist });
  } catch (err) {
    console.error('Add track error:', err);
    return res.status(500).json({ error: 'Failed to add track to playlist' });
  }
};

export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const { id, trackId } = req.params;

    await prisma.playlistTrack.deleteMany({
      where: { playlistId: id, trackId }
    });

    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: { include: { track: true }, orderBy: { position: 'asc' } }
      }
    });

    return res.json({ success: true, playlist: updatedPlaylist });
  } catch (err) {
    console.error('Remove track error:', err);
    return res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
};
