import { prisma } from '../config/db.js';

export const getPlaylists = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ playlists: [] });

    const playlists = await prisma.playlist.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId } } }
        ]
      },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' }
        },
        collaborators: { include: { user: { select: { id: true, username: true, avatar: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = playlists.map(p => ({
      ...p,
      owner: {
        ...p.owner,
        avatarUrl: p.owner?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.owner?.username || 'user'}`
      }
    }));

    return res.json({ playlists: formatted });
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
        description: description || 'Created on Musicfy',
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        isPublic: isPublic !== false,
        isCollab: isCollab === true,
        ownerId: userId
      },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: true
      }
    });

    const formatted = {
      ...playlist,
      owner: {
        ...playlist.owner,
        avatarUrl: playlist.owner?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${playlist.owner?.username || 'user'}`
      }
    };

    return res.status(201).json({ playlist: formatted });
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
        },
        collaborators: {
          include: { user: { select: { id: true, username: true, avatar: true } } }
        }
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const formatted = {
      ...playlist,
      owner: {
        ...playlist.owner,
        avatarUrl: playlist.owner?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${playlist.owner?.username || 'user'}`
      }
    };

    return res.json({ playlist: formatted });
  } catch (err) {
    console.error('Get playlist by id error:', err);
    return res.status(500).json({ error: 'Failed to fetch playlist' });
  }
};

export const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, isPublic, isCollab, coverUrl } = req.body;

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (playlist.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the playlist owner can edit settings' });
    }

    const updated = await prisma.playlist.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isCollab !== undefined && { isCollab }),
        ...(coverUrl && { coverUrl })
      },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        tracks: { include: { track: true } }
      }
    });

    const formatted = {
      ...updated,
      owner: {
        ...updated.owner,
        avatarUrl: updated.owner?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${updated.owner?.username || 'user'}`
      }
    };

    return res.json({ playlist: formatted });
  } catch (err) {
    console.error('Update playlist error:', err);
    return res.status(500).json({ error: 'Failed to update playlist' });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (playlist.ownerId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.playlist.delete({ where: { id } });
    return res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Delete playlist error:', err);
    return res.status(500).json({ error: 'Failed to delete playlist' });
  }
};

export const addTrackToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { track } = req.body;

    if (!track || !track.id) {
      return res.status(400).json({ error: 'Valid track details are required' });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: { collaborators: true }
    });

    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const isOwner = playlist.ownerId === userId;
    const isCollab = playlist.collaborators.some(c => c.userId === userId);
    if (!isOwner && (!playlist.isCollab || !isCollab)) {
      return res.status(403).json({ error: 'You do not have permission to add tracks to this playlist' });
    }

    // Ensure track exists in DB
    await prisma.track.upsert({
      where: { id: track.id },
      update: {
        title: track.title || 'Unknown Track',
        artistName: track.artistName || 'Unknown Artist',
        thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`
      },
      create: {
        id: track.id,
        title: track.title || 'Unknown Track',
        artistName: track.artistName || 'Unknown Artist',
        thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`,
        durationSec: track.durationSec || 200,
        category: track.category || 'Music'
      }
    });

    const count = await prisma.playlistTrack.count({ where: { playlistId: id } });

    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId: id,
        trackId: track.id,
        position: count + 1,
        addedById: userId
      },
      include: { track: true }
    });

    // Notify owner if added by collaborator
    if (!isOwner) {
      await prisma.notification.create({
        data: {
          userId: playlist.ownerId,
          actorId: userId,
          type: 'COLLAB_ADD',
          message: `${req.user.username} added ${track.title} to your playlist ${playlist.title}`
        }
      }).catch(() => {});
    }

    return res.status(201).json({ playlistTrack });
  } catch (err) {
    console.error('Add track to playlist error:', err);
    return res.status(500).json({ error: 'Failed to add track to playlist' });
  }
};

export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const { id, trackId } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: { collaborators: true }
    });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const isOwner = playlist.ownerId === userId;
    const isCollab = playlist.collaborators.some(c => c.userId === userId);
    if (!isOwner && (!playlist.isCollab || !isCollab)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId: id,
        trackId
      }
    });

    return res.json({ message: 'Track removed from playlist' });
  } catch (err) {
    console.error('Remove track from playlist error:', err);
    return res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
};
