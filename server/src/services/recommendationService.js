import { prisma } from '../config/db.js';
import { FALLBACK_TRACKS, searchYouTubeTracks, getTrendingTracks } from './youtubeService.js';

export const getPersonalizedRecommendations = async (userId) => {
  try {
    let recentTracks = [];
    let likedTracks = [];

    if (userId) {
      // 1. Fetch user's actual database listening history (Deduplicated latest)
      const history = await prisma.listeningHistory.findMany({
        where: { userId },
        orderBy: { playedAt: 'desc' },
        take: 30,
        include: { track: true }
      }).catch(() => []);

      const seen = new Set();
      recentTracks = history
        .map(h => h.track)
        .filter(t => {
          if (!t || !t.id || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });

      // 2. Fetch user's actual liked tracks
      const likes = await prisma.like.findMany({
        where: { userId },
        include: { track: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      }).catch(() => []);

      likedTracks = likes.map(l => l.track).filter(Boolean);
    }

    // 3. Fallback to trending tracks if history is empty
    const trending = await getTrendingTracks().catch(() => FALLBACK_TRACKS);

    const continueListening = recentTracks.length > 0
      ? recentTracks.slice(0, 8)
      : trending.slice(0, 8);

    // 4. Compute User's True Favorite Artist from their real listening activity
    const artistCounts = {};
    [...recentTracks, ...likedTracks].forEach(t => {
      if (t && t.artistName) {
        artistCounts[t.artistName] = (artistCounts[t.artistName] || 0) + 1;
      }
    });

    const topArtistNames = Object.keys(artistCounts).sort((a, b) => artistCounts[b] - artistCounts[a]);
    const topArtist = topArtistNames[0] || (trending[0]?.artistName || "Top Artists");

    // 5. Query live YouTube tracks for the user's real favorite artist
    let becauseTracks = [];
    if (topArtist) {
      becauseTracks = await searchYouTubeTracks(`${topArtist} greatest hits`).catch(() => []);
    }

    if (!becauseTracks || becauseTracks.length === 0) {
      becauseTracks = trending.slice(2, 8);
    }

    // 6. Build Made For You mix based on liked tracks and top artists
    let madeForYou = [];
    if (likedTracks.length > 0) {
      madeForYou = likedTracks.slice(0, 8);
    } else if (topArtistNames.length > 1) {
      const secondArtistTracks = await searchYouTubeTracks(topArtistNames[1]).catch(() => []);
      madeForYou = secondArtistTracks.slice(0, 8);
    } else {
      madeForYou = trending.slice(4, 12);
    }

    // 7. New Discoveries (Diverse tracks outside the user's immediate history)
    const recentIds = new Set(recentTracks.map(t => t.id));
    const newDiscoveries = trending.filter(t => !recentIds.has(t.id)).slice(0, 8);

    return {
      continueListening,
      madeForYou,
      becauseYouListened: {
        artist: topArtist,
        tracks: becauseTracks.slice(0, 6)
      },
      newDiscoveries: newDiscoveries.length > 0 ? newDiscoveries : trending.slice(0, 8),
      topArtists: topArtistNames.slice(0, 5)
    };
  } catch (err) {
    console.error('Recommendation Service error:', err);
    const fallback = await getTrendingTracks().catch(() => FALLBACK_TRACKS);
    return {
      continueListening: fallback.slice(0, 6),
      madeForYou: fallback.slice(2, 8),
      becauseYouListened: { artist: fallback[0]?.artistName || "Trending", tracks: fallback.slice(0, 6) },
      newDiscoveries: fallback.slice(4, 10),
      topArtists: []
    };
  }
};
