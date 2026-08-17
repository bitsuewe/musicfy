import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, UserCheck, UserPlus, Disc, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import TrackRow from '../components/TrackRow';
import api from '../services/api';

export default function Artist({ onAddToPlaylist }) {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtist();
  }, [id]);

  const fetchArtist = async () => {
    try {
      const res = await api.get(`/music/artist/${encodeURIComponent(id || 'The Weeknd')}`);
      setProfile(res.data);
    } catch (err) {
      console.error('Fetch artist failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
    return <div className="p-8 text-center text-[#A1A1AA] animate-pulse">Loading artist universe...</div>;
  }

  const handlePlayArtist = () => {
    if (profile.topTracks?.length > 0) {
      playTrack(profile.topTracks[0], profile.topTracks);
    }
  };

  return (
    <div className="pb-32 animate-fadeIn select-none">
      {/* Hero Banner with Dynamic Blur Atmosphere */}
      <div className="relative min-h-[260px] sm:min-h-[320px] md:min-h-[380px] overflow-hidden flex items-end p-4 sm:p-6 md:p-10 border-b border-[#27272A]">
        <img
          src={profile.bannerUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/60 to-transparent" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 w-full max-w-7xl mx-auto">
          <img
            src={profile.avatarUrl}
            alt={profile.artistName}
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-3xl object-cover border-2 border-white/10 shadow-2xl shrink-0"
          />
          <div className="space-y-1.5 sm:space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Verified Artist
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              {profile.artistName}
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] font-medium">
              {profile.monthlyListeners} monthly listeners
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar & Popular Tracks */}
      <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-10">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <button
            onClick={handlePlayArtist}
            className="px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#34D399] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
            Play Popular
          </button>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors ${
              isFollowing
                ? 'bg-[#18181C] border-[#10B981] text-[#34D399]'
                : 'border-[#27272A] text-white hover:border-[#10B981]'
            }`}
          >
            {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isFollowing ? 'Following' : 'Follow Artist'}
          </button>
        </div>

        {/* Top Popular Tracks */}
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mb-3 sm:mb-4">
            Popular Tracks
          </h2>
          <div className="space-y-1 bg-[#111114] border border-[#27272A] rounded-2xl p-1.5 sm:p-2">
            {profile.topTracks?.map((track, i) => (
              <TrackRow
                key={track.id}
                index={i}
                track={track}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        </div>

        {/* Albums & Discography */}
        {profile.albums?.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
              Albums & Discography
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {profile.albums.map((alb) => (
                <div key={alb.id} className="p-3 sm:p-4 rounded-2xl bg-[#111114] border border-[#27272A] hover:border-[#10B981]/40 cursor-pointer hover:scale-[1.02] transition-all">
                  <img src={alb.coverUrl} alt="" className="w-full aspect-square rounded-xl object-cover mb-2.5 sm:mb-3" />
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">{alb.title}</h4>
                  <p className="text-[10px] sm:text-xs text-[#A1A1AA]">{alb.year} • Album</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
