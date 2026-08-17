import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, Heart, Users, Trash2, Plus, Clock, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { getLocalPlaylists, removeTrackFromSpecificPlaylist } from '../services/playlistStorage';
import TrackRow from '../components/TrackRow';
import api from '../services/api';

export default function Playlist({ onAddToPlaylist }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playTrack, setShuffle, isLiked } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylist();

    const handleUpdate = () => fetchPlaylist();
    window.addEventListener('spicify_playlists_updated', handleUpdate);
    return () => window.removeEventListener('spicify_playlists_updated', handleUpdate);
  }, [id, user]);

  const fetchPlaylist = async () => {
    setLoading(true);
    try {
      if (id === 'liked') {
        let tracks = [];
        try {
          const res = await api.get('/likes');
          tracks = (res.data.likes || []).map(l => l.track).filter(Boolean);
        } catch (e) {}

        // Fallback to local storage if DB is empty or unauthenticated
        if (tracks.length === 0) {
          try {
            const rawLocal = localStorage.getItem('spicify_user_liked_tracks');
            if (rawLocal) tracks = JSON.parse(rawLocal);
          } catch (e) {}
        }

        setPlaylist({
          id: 'liked',
          title: 'Liked Songs',
          description: 'Your personal collection of saved favorite tracks and music.',
          coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
          owner: { username: user?.username || 'You' },
          tracks: tracks.map(t => ({ track: t }))
        });
      } else {
        let found = null;
        try {
          const res = await api.get(`/playlists/${id}`);
          found = res.data.playlist;
        } catch (e) {}

        // Fallback to local storage playlist
        if (!found) {
          const locals = getLocalPlaylists();
          found = locals.find(p => p.id === id);
        }

        if (found) {
          setPlaylist(found);
        } else {
          setPlaylist(null);
        }
      }
    } catch (err) {
      console.error('Fetch playlist failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#B3B3B3] animate-pulse">Loading playlist...</div>;
  }

  if (!playlist) {
    return (
      <div className="p-12 text-center text-[#B3B3B3] space-y-3">
        <h2 className="text-xl font-bold text-white">Playlist Not Found</h2>
        <p className="text-xs">The playlist you're looking for doesn't exist or was removed.</p>
        <button
          onClick={() => navigate('/library')}
          className="px-4 py-2 rounded-xl bg-[#1DB954] text-black font-bold text-xs"
        >
          Go to Library
        </button>
      </div>
    );
  }

  const rawTracks = (playlist.tracks || []).map(item => item.track || item).filter(Boolean);

  const handlePlayAll = () => {
    if (rawTracks.length > 0) {
      playTrack(rawTracks[0], rawTracks);
    }
  };

  const handleShufflePlay = () => {
    if (rawTracks.length > 0) {
      setShuffle(true);
      const randIndex = Math.floor(Math.random() * rawTracks.length);
      playTrack(rawTracks[randIndex], rawTracks);
    }
  };

  const handleRemoveTrack = async (trackId) => {
    if (id === 'liked') return;
    try {
      await removeTrackFromSpecificPlaylist(id, trackId, user);
      setPlaylist(prev => ({
        ...prev,
        tracks: (prev.tracks || []).filter(t => (t.track?.id || t.id) !== trackId)
      }));
    } catch (err) {
      alert('Failed to remove track');
    }
  };

  return (
    <div className="pb-32 animate-fadeIn select-none">
      {/* Spotify Signature Playlist Hero Header */}
      <div className="p-4 sm:p-6 md:p-10 border-b border-[#282828] bg-gradient-to-b from-[#282828] to-[#121212]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
          <img
            src={playlist.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'}
            alt=""
            className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-2xl object-cover shadow-2xl shrink-0"
          />

          <div className="space-y-2 sm:space-y-3 text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#1DB954]">
                PLAYLIST
              </span>
              {playlist.isCollab && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Collaborative
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
              {playlist.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#B3B3B3] font-medium line-clamp-2">{playlist.description}</p>
            <p className="text-xs font-bold text-[#B3B3B3]">
              Created by <span className="text-white font-bold">{playlist.owner?.username || 'You'}</span> • <span className="text-white">{rawTracks.length} songs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Spotify Play Action Bar & Track Table */}
      <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            onClick={handlePlayAll}
            disabled={rawTracks.length === 0}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            title="Play Playlist"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black text-black ml-0.5" />
          </button>

          <button
            onClick={handleShufflePlay}
            disabled={rawTracks.length === 0}
            className="p-2 sm:p-3 text-[#B3B3B3] hover:text-[#1DB954] transition-colors disabled:opacity-50"
            title="Shuffle Playlist"
          >
            <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Track Table Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[#282828] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="w-5 text-center">#</span>
            <span>Title</span>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        {rawTracks.length === 0 ? (
          <div className="py-16 text-center text-[#B3B3B3] space-y-2">
            <Heart className="w-10 h-10 text-white/20 mx-auto" />
            <p className="text-sm font-bold text-white">No songs in this playlist yet</p>
            <p className="text-xs">Add songs using the "+" menu across Discover or Home.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rawTracks.map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                index={i}
                track={track}
                onAddToPlaylist={onAddToPlaylist}
                onRemove={id !== 'liked' ? handleRemoveTrack : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
