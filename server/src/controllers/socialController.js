import { prisma } from '../config/db.js';

export const toggleLikeTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const { trackId } = req.params;
    const { track } = req.body;

    if (!trackId) return res.status(400).json({ error: 'Track ID is required' });

    // Upsert track first so foreign key constraint holds
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

    const existingLike = await prisma.like.findUnique({
      where: { userId_trackId: { userId, trackId } }
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return res.json({ liked: false, message: 'Unliked track' });
    } else {
      await prisma.like.create({ data: { userId, trackId } });
      return res.json({ liked: true, message: 'Liked track' });
    }
  } catch (err) {
    console.error('Toggle like error:', err);
    return res.status(500).json({ error: 'Failed to toggle track like' });
  }
};

export const getUserLikes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ likes: [] });

    const dbLikes = await prisma.like.findMany({
      where: { userId },
      include: { track: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ likes: dbLikes || [] });
  } catch (err) {
    console.error('Get user likes error:', err);
    return res.status(500).json({ error: 'Failed to fetch user likes' });
  }
};

export const logHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { trackId, track, durationSec, completed, skipped } = req.body;

    if (!trackId) return res.status(400).json({ error: 'Track ID required' });

    // Ensure track exists
    await prisma.track.upsert({
      where: { id: trackId },
      update: {
        title: track?.title || 'Unknown Track',
        artistName: track?.artistName || 'Unknown Artist',
        thumbnail: track?.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`,
        durationSec: durationSec || track?.durationSec || 200,
        category: track?.category || 'Music'
      },
      create: {
        id: trackId,
        title: track?.title || 'Unknown Track',
        artistName: track?.artistName || 'Unknown Artist',
        thumbnail: track?.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`,
        durationSec: durationSec || track?.durationSec || 200,
        category: track?.category || 'Music'
      }
    });

    if (userId) {
      await prisma.listeningHistory.create({
        data: {
          userId,
          trackId,
          durationSec: durationSec || 0,
          completed: completed === true,
          skipped: skipped === true
        }
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Log history error:', err);
    return res.status(500).json({ error: 'Failed to log history' });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ history: [] });

    const history = await prisma.listeningHistory.findMany({
      where: { userId },
      include: { track: true },
      orderBy: { playedAt: 'desc' },
      take: 30
    });

    return res.json({ history: history || [] });
  } catch (err) {
    console.error('Get user history error:', err);
    return res.status(500).json({ error: 'Failed to fetch user history' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { username: id }]
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        createdAt: true,
        playlists: {
          where: { isPublic: true },
          include: { tracks: { include: { track: true } } }
        },
        likes: {
          take: 50,
          include: { track: true },
          orderBy: { createdAt: 'desc' }
        },
        history: {
          take: 30,
          include: { track: true },
          orderBy: { playedAt: 'desc' }
        },
        _count: {
          select: { followers: true, following: true, playlists: true, likes: true }
        }
      }
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        avatarUrl: dbUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${dbUser.username}`,
        bio: dbUser.bio || 'Exploring atmospheric music on Musicfy.',
        createdAt: dbUser.createdAt,
        playlists: dbUser.playlists || [],
        likes: dbUser.likes || [],
        history: dbUser.history || [],
        _count: {
          playlists: dbUser._count?.playlists || 0,
          likes: dbUser._count?.likes || 0,
          history: (dbUser.history || []).length,
          followers: dbUser._count?.followers || 0,
          following: dbUser._count?.following || 0
        }
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const toggleFollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followingId } = req.params;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId }
      }
    });

    if (existingFollow) {
      await prisma.follow.delete({ where: { id: existingFollow.id } });
      return res.json({ following: false, message: 'Unfollowed user' });
    } else {
      await prisma.follow.create({ data: { followerId, followingId } });
      return res.json({ following: true, message: 'Followed user' });
    }
  } catch (err) {
    console.error('Follow toggle error:', err);
    return res.status(500).json({ error: 'Failed to toggle follow status' });
  }
};

export const getActivityFeed = async (req, res) => {
  try {
    const history = await prisma.listeningHistory.findMany({
      include: {
        track: true,
        user: { select: { id: true, username: true, avatar: true } }
      },
      orderBy: { playedAt: 'desc' },
      take: 20
    });

    return res.json({ feed: history || [] });
  } catch (err) {
    console.error('Get activity feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json({ notifications: notifications || [] });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
