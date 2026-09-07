import { prisma, safeDbQuery } from '../config/db.js';
import {
  togglePersistentLike,
  getPersistentUserLikes,
  addPersistentHistory,
  getPersistentUserHistory,
  getPersistentUserProfileData
} from '../services/persistentUserDataStore.js';

export const toggleLikeTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const { trackId } = req.params;
    const { track } = req.body;

    if (!trackId) return res.status(400).json({ error: 'Track ID is required' });

    // 1. Immediately toggle in persistent store (guaranteed, fast, offline-safe)
    const result = togglePersistentLike(userId, trackId, track);

    // 2. Sync to Prisma in background with safeDbQuery
    safeDbQuery(async (p) => {
      await p.track.upsert({
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

      const existingLike = await p.like.findUnique({
        where: { userId_trackId: { userId, trackId } }
      });

      if (result.liked && !existingLike) {
        await p.like.create({ data: { userId, trackId } });
      } else if (!result.liked && existingLike) {
        await p.like.delete({ where: { id: existingLike.id } });
      }
    }, null, 2000).catch(() => {});

    return res.json({ liked: result.liked, message: result.liked ? 'Liked track' : 'Unliked track' });
  } catch (err) {
    console.error('Toggle like error:', err);
    return res.status(500).json({ error: 'Failed to toggle track like' });
  }
};

export const getUserLikes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ likes: [] });

    // 1. Retrieve user's likes from persistent store
    const persistentLikes = getPersistentUserLikes(userId);

    // 2. Try fetching from DB if available and merge
    const dbLikes = await safeDbQuery(
      (p) =>
        p.like.findMany({
          where: { userId },
          include: { track: true },
          orderBy: { createdAt: 'desc' }
        }),
      null,
      2000
    );

    if (Array.isArray(dbLikes) && dbLikes.length > 0) {
      const map = new Map();
      dbLikes.forEach((l) => map.set(l.trackId || l.track?.id, l));
      persistentLikes.forEach((l) => {
        const id = l.trackId || l.track?.id;
        if (!map.has(id)) map.set(id, l);
      });
      return res.json({ likes: Array.from(map.values()) });
    }

    return res.json({ likes: persistentLikes });
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

    // 1. Save to persistent user store immediately
    if (userId) {
      addPersistentHistory(userId, trackId, track, durationSec, completed);
    }

    // 2. Sync to DB in background
    safeDbQuery(async (p) => {
      await p.track.upsert({
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
        await p.listeningHistory.create({
          data: {
            userId,
            trackId,
            durationSec: durationSec || 0,
            completed: completed === true,
            skipped: skipped === true
          }
        });
      }
    }, null, 2000).catch(() => {});

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

    // 1. Get from persistent user store
    const persistentHistory = getPersistentUserHistory(userId, 30);

    // 2. Try fetching from DB if available and merge
    const dbHistory = await safeDbQuery(
      (p) =>
        p.listeningHistory.findMany({
          where: { userId },
          include: { track: true },
          orderBy: { playedAt: 'desc' },
          take: 30
        }),
      null,
      2000
    );

    if (Array.isArray(dbHistory) && dbHistory.length > 0) {
      const map = new Map();
      dbHistory.forEach((h) => map.set(h.trackId || h.track?.id, h));
      persistentHistory.forEach((h) => {
        const id = h.trackId || h.track?.id;
        if (!map.has(id)) map.set(id, h);
      });
      return res.json({ history: Array.from(map.values()) });
    }

    return res.json({ history: persistentHistory });
  } catch (err) {
    console.error('Get user history error:', err);
    return res.status(500).json({ error: 'Failed to fetch user history' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    // 1. Fast, reliable lookup from persistent user data store
    const profile = getPersistentUserProfileData(id);

    // 2. Check DB if available and merge any additional counts/playlists
    const dbUser = await safeDbQuery(
      (p) =>
        p.user.findFirst({
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
              take: 20,
              include: { track: true },
              orderBy: { createdAt: 'desc' }
            },
            history: {
              take: 20,
              include: { track: true },
              orderBy: { playedAt: 'desc' }
            },
            _count: {
              select: { followers: true, following: true, playlists: true, likes: true }
            }
          }
        }),
      null,
      2000
    );

    if (dbUser) {
      const mergedLikes = [...(dbUser.likes || []), ...(profile?.likes || [])];
      const uniqueLikes = [];
      const seenLike = new Set();
      mergedLikes.forEach((l) => {
        const tid = l.trackId || l.track?.id;
        if (tid && !seenLike.has(tid)) {
          seenLike.add(tid);
          uniqueLikes.push(l);
        }
      });

      const mergedPlaylists = [...(dbUser.playlists || []), ...(profile?.playlists || [])];
      const uniquePlaylists = [];
      const seenPl = new Set();
      mergedPlaylists.forEach((p) => {
        if (p.id && !seenPl.has(p.id)) {
          seenPl.add(p.id);
          uniquePlaylists.push(p);
        }
      });

      const mergedHistory = [...(dbUser.history || []), ...(profile?.history || [])];
      const uniqueHistory = [];
      const seenHist = new Set();
      mergedHistory.forEach((h) => {
        const tid = h.trackId || h.track?.id;
        if (tid && !seenHist.has(tid)) {
          seenHist.add(tid);
          uniqueHistory.push(h);
        }
      });

      return res.json({
        user: {
          id: dbUser.id,
          username: dbUser.username,
          avatarUrl: dbUser.avatar || profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${dbUser.username}`,
          bio: dbUser.bio || profile?.bio || 'Exploring atmospheric music on Musicfy.',
          createdAt: dbUser.createdAt,
          playlists: uniquePlaylists,
          likes: uniqueLikes,
          history: uniqueHistory,
          _count: {
            playlists: Math.max(dbUser._count?.playlists || 0, uniquePlaylists.length),
            likes: Math.max(dbUser._count?.likes || 0, uniqueLikes.length),
            history: uniqueHistory.length,
            followers: dbUser._count?.followers || 0,
            following: dbUser._count?.following || 0
          }
        }
      });
    }

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: profile });
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

    const result = await safeDbQuery(async (p) => {
      const existingFollow = await p.follow.findUnique({
        where: {
          followerId_followingId: { followerId, followingId }
        }
      });

      if (existingFollow) {
        await p.follow.delete({ where: { id: existingFollow.id } });
        return { following: false, message: 'Unfollowed user' };
      } else {
        await p.follow.create({ data: { followerId, followingId } });
        return { following: true, message: 'Followed user' };
      }
    }, { following: true, message: 'Followed user' }, 2000);

    return res.json(result);
  } catch (err) {
    console.error('Follow toggle error:', err);
    return res.status(500).json({ error: 'Failed to toggle follow status' });
  }
};

export const getActivityFeed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const globalHistory = getPersistentUserHistory(userId, 20);
    return res.json({ feed: globalHistory });
  } catch (err) {
    console.error('Get activity feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await safeDbQuery(
      (p) =>
        p.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20
        }),
      [],
      2000
    );

    return res.json({ notifications: notifications || [] });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
