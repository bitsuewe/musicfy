import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Plus, ListMusic, Clock, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TrackCard from '../components/TrackCard';
import { fetchAllPlaylists } from '../services/playlistStorage';
import api from '../services/api';

export default function Library({ onRequestCreatePlaylist, onAddToPlaylist }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [playlists, setPlaylists] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibrary();

    const handleUpdate = () => fetchLibrary();
    window.addEventListener('spicify_playlists_updated', handleUpdate);
    return () => window.removeEventListener('spicify_playlists_updated', handleUpdate);
  }, [user]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      // 1. Fetch playlists via unified storage service
      const allPlaylists = await fetchAllPlaylists(user);
      setPlaylists(allPlaylists);

      // 2. Fetch likes count (DB + local fallback)
      let likes = [];
      try {
        const likeRes = await api.get('/likes');
        likes = (likeRes.data.likes || []).map(l => l.track).filter(Boolean);
      } catch (e) {}

      if (likes.length === 0) {
        try {
          const rawLocal = localStorage.getItem('spicify_user_liked_tracks');
          if (rawLocal) likes = JSON.parse(rawLocal);
        } catch (e) {}
      }
      setLikedCount(likes.length);

      // 3. Fetch history
      let histTracks = [];
      try {
        const histRes = await api.get('/history');
        histTracks = (histRes.data.history || []).map(f => f.track).filter(Boolean);
      } catch (e) {}

      if (histTracks.length === 0) {
        try {
          const rawLocal = localStorage.getItem('spicify_user_recent_tracks');
          if (rawLocal) histTracks = JSON.parse(rawLocal);
        } catch (e) {}
      }
      setHistory(histTracks);
    } catch (err) {
      console.error('Fetch library failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">Your Library</h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 font-medium">
            Your saved tracks, custom playlists, and listening history.
          </p>
        </div>
        <button
          onClick={onRequestCreatePlaylist}
          className="self-start sm:self-auto px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#34D399] text-white font-semibold text-xs flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3 overflow-x-auto no-scrollbar">
        {['all', 'playlists', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold capitalize transition-colors shrink-0 ${
              activeTab === tab
                ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      {(activeTab === 'all' || activeTab === 'playlists') && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-3 sm:mb-4">
            Playlists & Saved Songs
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Liked Songs Special Tile */}
            <div
              onClick={() => navigate('/playlist/liked')}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#047857] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between aspect-square shadow-lg"
            >
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-white" />
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight">Liked Songs</h3>
                <p className="text-[11px] sm:text-xs text-white/80 font-medium">{likedCount} saved tracks</p>
              </div>
            </div>

            {/* Custom User Playlists */}
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                className="p-3 sm:p-4 rounded-2xl bg-[#111114] border border-[#27272A] hover:border-[#10B981]/40 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col"
              >
                <img
                  src={pl.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'}
                  alt=""
                  className="w-full aspect-square rounded-xl object-cover mb-2.5 sm:mb-3"
                />
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">{pl.title}</h4>
                <p className="text-[10px] sm:text-xs text-[#A1A1AA] truncate mt-0.5">
                  {pl.isCollab ? 'Collaborative' : 'Playlist'} • {pl.tracks?.length || 0} tracks
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History */}
      {(activeTab === 'all' || activeTab === 'history') && history.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-3 sm:mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#34D399]" />
            Recently Played
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {history.slice(0, 12).map((track, i) => (
              <TrackCard key={`hist-${track.id}-${i}`} track={track} onAddToPlaylist={onAddToPlaylist} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
