import { searchYouTubeTracks, getTrendingTracks, getArtistProfile } from '../services/youtubeService.js';
import { getPersonalizedRecommendations } from '../services/recommendationService.js';
import { prisma } from '../config/db.js';

export const searchMusic = async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q || !q.trim()) {
      const trending = await getTrendingTracks();
      return res.json({ tracks: trending, category: 'trending' });
    }

    const tracks = await searchYouTubeTracks(q.trim(), category || 'all');
    
    // Asynchronously upsert returned tracks to local DB for relations
    for (const tr of tracks.slice(0, 10)) {
      await prisma.track.upsert({
        where: { id: tr.id },
        update: { title: tr.title, artistName: tr.artistName, thumbnail: tr.thumbnail },
        create: {
          id: tr.id,
          title: tr.title,
          artistName: tr.artistName,
          channelId: tr.channelId,
          thumbnail: tr.thumbnail,
          durationSec: tr.durationSec || 200,
          viewCount: tr.viewCount,
          publishedAt: tr.publishedAt,
          category: tr.category || "Music"
        }
      }).catch(() => {});
    }

    return res.json({ tracks, query: q });
  } catch (err) {
    console.error('Search music error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
};

export const getTrending = async (req, res) => {
  try {
    const tracks = await getTrendingTracks();
    return res.json({ tracks });
  } catch (err) {
    console.error('Get trending error:', err);
    return res.status(500).json({ error: 'Failed to fetch trending music' });
  }
};

export const getArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await getArtistProfile(id);
    return res.json(profile);
  } catch (err) {
    console.error('Get artist error:', err);
    return res.status(500).json({ error: 'Failed to fetch artist profile' });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const recs = await getPersonalizedRecommendations(userId);
    return res.json(recs);
  } catch (err) {
    console.error('Get recommendations error:', err);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};
