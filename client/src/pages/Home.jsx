import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Flame,
  Radio,
  Moon,
  Zap,
  Headphones,
  Compass,
  History,
  ListMusic,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from '../components/TrackCard';
import PlaylistCard from '../components/PlaylistCard';
import OfflineNotice from '../components/OfflineNotice';
import { fetchAllPlaylists } from '../services/playlistStorage';
import { getAllDownloadedTracks } from '../services/webOfflineStorage';
import api from '../services/api';

const MOOD_CHIPS = [
  { id: 'all', label: 'All', icon: Headphones },
  { id: 'chill', label: 'Chill & Relax', icon: Moon },
  { id: 'focus', label: 'Deep Focus', icon: Radio },
  { id: 'energy', label: 'Workout & Energy', icon: Zap },
  { id: 'late_night', label: 'Late Night Vibes', icon: Flame },
  { id: 'lofi', label: 'Lo-Fi Beats', icon: Compass }
];

export default function Home({ onAddToPlaylist }) {
  const { user, loading: authLoading } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, recentlyPlayed, playOfflineQueue } = usePlayer();
  const [activeMood, setActiveMood] = useState('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const [recs, setRecs] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchHomeData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      loadOfflineData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchHomeData();
    loadPlaylists();
    loadOfflineData();

    const handlePlaylistUpdate = () => loadPlaylists();
    window.addEventListener('spicify_playlists_updated', handlePlaylistUpdate);
    return () => window.removeEventListener('spicify_playlists_updated', handlePlaylistUpdate);
  }, [user]);

  const loadOfflineData = () => {
    getAllDownloadedTracks()
      .then(data => setDownloadedTracks(data?.allTracks || []))
      .catch(() => {});
  };

  const loadPlaylists = () => {
    fetchAllPlaylists(user)
      .then(list => setPlaylists(list || []))
      .catch(() => {});
  };

  const fetchHomeData = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/music/recommendations');
      setRecs(res.data);
      setIsOnline(true);
    } catch (err) {
      console.error('Fetch home recommendations failed:', err);
      if (typeof navigator !== 'undefined' && (!navigator.onLine || !err.response)) {
        setIsOnline(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Combine real-time active session plays with server history (deduplicated)
  const activeRecentTracks = useMemo(() => {
    const combined = [...(recentlyPlayed || []), ...(recs?.continueListening || [])];
    const seen = new Set();
    return combined.filter(t => {
      if (!t || !t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [recentlyPlayed, recs?.continueListening]);

  // Compute active user's top artist
  const activeTopArtist = useMemo(() => {
    if (activeRecentTracks.length > 0 && activeRecentTracks[0].artistName) {
      return activeRecentTracks[0].artistName;
    }
    return recs?.becauseYouListened?.artist || "Featured Artists";
  }, [activeRecentTracks, recs?.becauseYouListened?.artist]);

  // Build Personalized Hero Showcase based on user activity
  const heroSlides = useMemo(() => {
    const slides = [];

    // 1. User's most recently played track
    if (activeRecentTracks.length > 0) {
      const t = activeRecentTracks[0];
      slides.push({
        id: t.id,
        tag: "YOUR RECENT PLAY",
        badge: "Jump Right Back In",
        title: t.title,
        artist: t.artistName,
        description: `Continue your listening session with ${t.artistName}.`,
        coverUrl: t.thumbnail,
        color: "from-[#1DB954]/25 via-zinc-900/90 to-[#121212]",
        track: t
      });
    }

    // 2. User's top artist recommendation
    if (recs?.becauseYouListened?.tracks?.[0] && activeTopArtist) {
      const t = recs.becauseYouListened.tracks[0];
      slides.push({
        id: t.id,
        tag: `FOR YOU • ${activeTopArtist.toUpperCase()}`,
        badge: "Personalized Recommendation",
        title: t.title,
        artist: t.artistName,
        description: `Based on your listening activity with ${activeTopArtist}.`,
        coverUrl: t.thumbnail,
        color: "from-teal-950/60 via-zinc-900/90 to-[#121212]",
        track: t
      });
    }

    // 3. User's favorite / made for you track
    if (recs?.madeForYou?.[0]) {
      const t = recs.madeForYou[0];
      slides.push({
        id: t.id,
        tag: "YOUR DAILY MIX",
        badge: "Curated for Your Taste",
        title: t.title,
        artist: t.artistName,
        description: `Tailored tracks matching your preferences and saved likes.`,
        coverUrl: t.thumbnail,
        color: "from-emerald-950/60 via-zinc-900/90 to-[#121212]",
        track: t
      });
    }

    // Fallback if empty
    if (slides.length === 0) {
      slides.push({
        id: currentTrack?.id || "fHI8X4OXluQ",
        tag: "DISCOVER MUSIC",
        badge: "High-Fidelity Audio",
        title: currentTrack?.title || "Trending Global Hits",
        artist: currentTrack?.artistName || "Top Artists",
        description: "Search and play any song across millions of tracks worldwide.",
        coverUrl: currentTrack?.thumbnail || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
        color: "from-[#1DB954]/20 via-zinc-900/90 to-[#121212]",
        track: currentTrack
      });
    }

    return slides;
  }, [activeRecentTracks, recs, activeTopArtist, currentTrack]);

  const activeHero = heroSlides[heroIndex % heroSlides.length];
  const isHeroPlaying = currentTrack?.id === activeHero?.id && isPlaying;

  // Auto-cycle hero banner
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Filter tracks by mood
  const filterByMood = (tracks) => {
    if (!tracks) return [];
    if (activeMood === 'all') return tracks;
    const moodMap = {
      chill: ['pop', 'soul', 'indie', 'r&b', 'chill'],
      focus: ['synthwave', 'rock', 'electronic', 'ambient'],
      energy: ['latin', 'reggaeton', 'funk', 'pop', 'dance', 'rock'],
      late_night: ['r&b', 'soul', 'pop', 'synthwave'],
      lofi: ['synthwave', 'indie', 'chill', 'lo-fi']
    };
    const allowed = moodMap[activeMood] || [];
    const matched = tracks.filter(t => 
      allowed.some(a => (t.category || '').toLowerCase().includes(a) || (t.title || '').toLowerCase().includes(a))
    );
    return matched.length > 0 ? matched : tracks.slice(0, 6);
  };

  // Quick picks tracks for Spotify signature 6-grid
  const quickPicks = useMemo(() => {
    const list = activeRecentTracks.length > 0
      ? activeRecentTracks
      : (recs?.continueListening || recs?.madeForYou || []);
    return list.slice(0, 6);
  }, [activeRecentTracks, recs]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-9 pb-36 animate-fadeIn select-none font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Offline Notice Banner */}
      {!isOnline && (
        <OfflineNotice
          compact
          onRetry={fetchHomeData}
          title="You're offline"
          description="Showing your downloaded music available without an internet connection."
        />
      )}

      {/* 🚀 Offline Ready Section: Downloaded Songs */}
      {!isOnline && (
        <section className="space-y-4 bg-[#18181C]/90 border border-[#10B981]/40 p-5 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981] shadow-md">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Downloaded Music</span>
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                    Offline Ready
                  </span>
                </h2>
                <p className="text-xs text-[#B3B3B3] font-medium mt-0.5">
                  {downloadedTracks.length > 0
                    ? `${downloadedTracks.length} song${downloadedTracks.length > 1 ? 's' : ''} stored locally on this device`
                    : "No songs saved for offline playback yet."}
                </p>
              </div>
            </div>

            {downloadedTracks.length > 0 && (
              <button
                onClick={() => playOfflineQueue(downloadedTracks, 0)}
                className="px-5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                <span>Play All Offline</span>
              </button>
            )}
          </div>

          {downloadedTracks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6 pt-2">
              {downloadedTracks.map((track) => (
                <TrackCard
                  key={`dl-home-${track.id}`}
                  track={track}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-[#A1A1AA] text-xs bg-white/5 rounded-xl border border-white/5">
              <p>When you're online, tap the download button on any song to save it for offline listening.</p>
            </div>
          )}
        </section>
      )}

      {/* 🌟 1. Spotify Header & Mood Filter Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>{getGreeting()}{user ? `, ${user.username}` : ''}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#B3B3B3] font-medium mt-1">
            {user ? (
              "Your personalized universe of music, tailored to your listening habits."
            ) : authLoading ? (
              <span className="inline-block w-48 h-3.5 bg-white/5 rounded animate-pulse" />
            ) : (
              "Hand-curated playlists, global live streams, and tailored recommendations."
            )}
          </p>
        </div>

        {/* Mood Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {MOOD_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeMood === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveMood(chip.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#282828] text-white hover:bg-[#3E3E3E]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black fill-black' : 'text-[#B3B3B3]'}`} />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ⚡ 2. Spotify Signature 6-Item Quick-Access Tiles */}
      {quickPicks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickPicks.map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={`quick-${track.id}`}
                onClick={() => playTrack(track)}
                className="group flex items-center bg-[#282828]/70 hover:bg-[#383838] rounded-md overflow-hidden cursor-pointer transition-all duration-200 shadow-sm relative pr-4"
              >
                <img
                  src={track.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80'}
                  alt=""
                  className="w-16 h-16 object-cover flex-shrink-0 shadow-md"
                />
                <div className="px-3.5 overflow-hidden flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isThisPlaying ? 'text-[#1ED760]' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-[#B3B3B3] truncate font-normal mt-0.5">
                    {track.artistName}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isThisPlaying) togglePlay();
                    else playTrack(track);
                  }}
                  className="w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-105 active:scale-95 drop-shadow-lg shrink-0 ml-2"
                  title="Play"
                >
                  {isThisPlaying ? (
                    <Pause className="w-5 h-5 fill-black text-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 🎬 3. Dynamic Hero Spotlight Showcase */}
      {activeHero && (
        <div className="relative rounded-2xl overflow-hidden border border-[#282828] shadow-2xl bg-[#121212] transition-all duration-700 min-h-[300px] sm:min-h-[340px] flex items-end">
          <img
            src={activeHero.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 transition-all duration-1000"
          />

          <div className={`absolute inset-0 bg-gradient-to-t ${activeHero.color} opacity-95`} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-white backdrop-blur-md border border-white/15">
                {activeHero.tag}
              </span>
              <span className="text-xs font-bold text-[#1ED760] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {activeHero.badge}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                {activeHero.title}
              </h2>
              <p className="text-base sm:text-lg font-bold text-white/80 mt-1">
                {activeHero.artist}
              </p>
              <p className="text-xs sm:text-sm text-[#B3B3B3] font-normal line-clamp-2 mt-1.5 max-w-lg">
                {activeHero.description}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  if (isHeroPlaying) togglePlay();
                  else if (activeHero.track) playTrack(activeHero.track);
                }}
                className="px-6 py-3 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black font-extrabold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-sm"
              >
                {isHeroPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-black text-black" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                    Listen Now
                  </>
                )}
              </button>

              {activeHero.track && (
                <button
                  onClick={() => addToQueue(activeHero.track)}
                  className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/15 transition-all"
                  title="Add to Queue"
                >
                  Add to Queue
                </button>
              )}
            </div>
          </div>

          {heroSlides.length > 1 && (
            <div className="absolute top-5 right-5 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    heroIndex === i ? 'w-6 bg-[#1ED760]' : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-[#181818] animate-pulse space-y-3">
              <div className="aspect-square bg-[#282828] rounded-md" />
              <div className="h-4 bg-[#282828] rounded w-3/4" />
              <div className="h-3 bg-[#282828] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 🎧 4. Made For You (Spotify Signature Section) */}
          {recs?.madeForYou?.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight hover:underline cursor-pointer">
                    Made For You
                  </h2>
                  <p className="text-xs text-[#B3B3B3] font-medium mt-0.5">
                    Your personal mix curated to match your musical taste.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                {filterByMood(recs.madeForYou).map((track) => (
                  <TrackCard
                    key={`mfy-${track.id}`}
                    track={track}
                    onAddToPlaylist={onAddToPlaylist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 💎 5. Personalized Editorial Station based on User's Actual Top Artist */}
          {recs?.becauseYouListened?.tracks?.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight hover:underline cursor-pointer">
                    Because you love {activeTopArtist}
                  </h2>
                  <p className="text-xs text-[#B3B3B3] font-medium mt-0.5">
                    Recommended tracks based on your listening habits with {activeTopArtist}.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                {recs.becauseYouListened.tracks.map((track) => (
                  <TrackCard
                    key={`byl-${track.id}`}
                    track={track}
                    onAddToPlaylist={onAddToPlaylist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 🚀 6. Continue Listening Row */}
          {activeRecentTracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight hover:underline cursor-pointer">
                    Continue Listening
                  </h2>
                  <p className="text-xs text-[#B3B3B3] font-medium mt-0.5">
                    Pick up right where you left off.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                {filterByMood(activeRecentTracks).map((track) => (
                  <TrackCard
                    key={`cont-${track.id}`}
                    track={track}
                    onAddToPlaylist={onAddToPlaylist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 🌍 7. Trending Discoveries */}
          {recs?.newDiscoveries?.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight hover:underline cursor-pointer">
                    Trending Hits & New Discoveries
                  </h2>
                  <p className="text-xs text-[#B3B3B3] font-medium mt-0.5">
                    The hottest songs trending across the world right now.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                {filterByMood(recs.newDiscoveries).map((track) => (
                  <TrackCard
                    key={`nd-${track.id}`}
                    track={track}
                    onAddToPlaylist={onAddToPlaylist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 📻 8. Featured Playlists & Collections */}
          {playlists.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight hover:underline cursor-pointer">
                    Your Playlists & Collections
                  </h2>
                  <p className="text-xs text-[#B3B3B3] font-medium mt-0.5">
                    Playlists created and saved to your Musicfy universe.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                {playlists.slice(0, 12).map((pl) => (
                  <PlaylistCard key={`home-pl-${pl.id}`} playlist={pl} />
                ))}
              </div>
            </section>
          )}

        </>
      )}

    </div>
  );
}
