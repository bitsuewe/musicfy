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
  ChevronRight,
  TrendingUp,
  Music2,
  Compass,
  Heart,
  ListPlus,
  Clock,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from '../components/TrackCard';
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
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, recentlyPlayed } = usePlayer();
  const [activeMood, setActiveMood] = useState('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, [user]);

  const fetchHomeData = async () => {
    try {
      const res = await api.get('/music/recommendations');
      setRecs(res.data);
    } catch (err) {
      console.error('Fetch home recommendations failed:', err);
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

  // Build Personalized Hero Showcase based on what the user actually listened to
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
        color: "from-emerald-950/80 via-zinc-900/90 to-[#09090B]",
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
        color: "from-teal-950/80 via-zinc-900/90 to-[#09090B]",
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
        color: "from-indigo-950/80 via-zinc-900/90 to-[#09090B]",
        track: t
      });
    }

    // Fallback if empty
    if (slides.length === 0) {
      slides.push({
        id: currentTrack?.id || "fHI8X4OXluQ",
        tag: "DISCOVER MUSIC",
        badge: "Lossless • High-Fidelity",
        title: currentTrack?.title || "Trending Global Hits",
        artist: currentTrack?.artistName || "Top Artists",
        description: "Search and play any song across millions of tracks worldwide.",
        coverUrl: currentTrack?.thumbnail || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
        color: "from-emerald-950/80 via-zinc-900/90 to-[#09090B]",
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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-10 pb-36 animate-fadeIn select-none">
      
      {/* 🌟 1. Header & Dynamic Mood Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3">
            {getGreeting()}{user ? `, ${user.username}` : ''}
            <span className="text-2xl animate-pulse">✨</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] font-medium mt-1">
            {user ? "Your personalized universe of music, tailored to your listening habits." : "Hand-curated playlists, global live streams, and tailored recommendations."}
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 scale-105'
                    : 'bg-white/5 text-[#D4D4D8] hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black fill-black' : ''}`} />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🎬 2. Dynamic Personalized Hero Spotlight Showcase */}
      {activeHero && (
        <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-zinc-950 transition-all duration-700 min-h-[340px] flex items-end">
          
          <img
            src={activeHero.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105 transition-all duration-1000"
          />

          <div className={`absolute inset-0 bg-gradient-to-t ${activeHero.color} opacity-90`} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/15 text-white backdrop-blur-md border border-white/20">
                {activeHero.tag}
              </span>
              <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {activeHero.badge}
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
                {activeHero.title}
              </h2>
              <p className="text-lg sm:text-xl font-bold text-white/80 mt-1">
                {activeHero.artist}
              </p>
              <p className="text-xs sm:text-sm text-zinc-300 font-medium line-clamp-2 mt-2 max-w-lg">
                {activeHero.description}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  if (isHeroPlaying) togglePlay();
                  else if (activeHero.track) playTrack(activeHero.track);
                }}
                className="px-6 py-3 rounded-full bg-white text-black font-extrabold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
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
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/15 transition-all"
                  title="Add to Queue"
                >
                  <ListPlus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {heroSlides.length > 1 && (
            <div className="absolute top-6 right-6 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    heroIndex === i ? 'w-6 bg-[#10B981]' : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ⚡ 3. Real Recent Activity: Jump Back In Grid (User's Exact Played Songs) */}
          {activeRecentTracks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#10B981]" />
                  Your Recent Activity & Jump Back In
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeRecentTracks.slice(0, 6).map((track) => {
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  return (
                    <div
                      key={`quick-${track.id}`}
                      onClick={() => playTrack(track)}
                      className="group flex items-center gap-3.5 bg-white/5 hover:bg-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border border-white/5 hover:border-white/15 shadow-sm p-1.5 pr-4"
                    >
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-md"
                      />
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isThisPlaying ? 'text-[#10B981]' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-[#A1A1AA] truncate font-medium mt-0.5">
                          {track.artistName}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isThisPlaying) togglePlay();
                          else playTrack(track);
                        }}
                        className="w-9 h-9 rounded-full bg-[#10B981] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-105 active:scale-95"
                      >
                        {isThisPlaying ? (
                          <Pause className="w-4 h-4 fill-black text-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 💎 4. Personalized Editorial Station based on User's Actual Top Artist */}
          {recs?.becauseYouListened?.tracks?.length > 0 && (
            <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-[#121216] border border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#10B981]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="mb-6 relative z-10">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#10B981] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  Personalized Station
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
                  Because you love {activeTopArtist}
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Hand-picked tracks based on your listening history with {activeTopArtist}.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10">
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

          {/* 🚀 5. Continue Listening Row (User's Exact Played Songs) */}
          {activeRecentTracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Continue Listening
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

          {/* 🎧 6. Made For You & Discovery Mix */}
          {recs?.madeForYou?.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Made For You
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

          {/* 🌍 7. Global New Discoveries */}
          {recs?.newDiscoveries?.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Trending Discoveries
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

        </>
      )}

    </div>
  );
}
