import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserCheck, UserPlus, Heart, ListMusic, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from '../components/TrackCard';
import PlaylistCard from '../components/PlaylistCard';
import { fetchAllPlaylists } from '../services/playlistStorage';
import api from '../services/api';

export default function Profile({ onAddToPlaylist }) {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { playTrack, likedTrackIds, recentlyPlayed } = usePlayer();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const targetId = id || currentUser?.id;

  useEffect(() => {
    if (targetId) {
      fetchProfile();
    }
  }, [targetId, currentUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${targetId}`);
      let userProf = res.data?.user;

      // If viewing self, ensure local real-time playlists and likes are merged
      if (currentUser && (targetId === currentUser.id || targetId === currentUser.username)) {
        const userPlaylists = await fetchAllPlaylists(currentUser).catch(() => []);
        if (userPlaylists.length > (userProf?.playlists?.length || 0)) {
          userProf = {
            ...userProf,
            playlists: userPlaylists,
            _count: {
              ...(userProf?._count || {}),
              playlists: userPlaylists.length
            }
          };
        }
      }

      setProfile(userProf);
    } catch (err) {
      console.error('Fetch profile fallback:', err);
      // Fallback to local profile data if network or server error
      if (currentUser && (targetId === currentUser.id || targetId === currentUser.username)) {
        let localLikes = [];
        let localRecents = [];
        let localPlaylists = [];

        try {
          const rawLikes = localStorage.getItem(`musicfy_likes_${currentUser.id}`);
          if (rawLikes) localLikes = JSON.parse(rawLikes);
        } catch (e) {}

        try {
          const rawRecents = localStorage.getItem(`musicfy_recents_${currentUser.id}`);
          if (rawRecents) localRecents = JSON.parse(rawRecents);
        } catch (e) {}

        try {
          localPlaylists = await fetchAllPlaylists(currentUser);
        } catch (e) {}

        setProfile({
          id: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.username)}`,
          bio: currentUser.bio || 'Exploring atmospheric music on Musicfy.',
          playlists: localPlaylists,
          likes: localLikes.map(t => ({ id: t.id, track: t })),
          history: localRecents.map(t => ({ id: t.id, track: t })),
          _count: {
            playlists: localPlaylists.length,
            likes: Math.max(localLikes.length, likedTrackIds?.size || 0),
            history: Math.max(localRecents.length, recentlyPlayed?.length || 0),
            followers: 0,
            following: 0
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#A1A1AA] animate-pulse">Loading user profile...</div>;
  }

  if (!profile) {
    return (
      <div className="p-12 text-center text-[#A1A1AA] space-y-3">
        <h2 className="text-xl font-bold text-white">User Profile Not Found</h2>
        <p className="text-xs">Please sign in or check the profile link.</p>
      </div>
    );
  }

  const isSelf = currentUser && (currentUser.id === profile.id || currentUser.username === profile.username);

  const displayLikesCount = isSelf && likedTrackIds?.size > 0
    ? Math.max(likedTrackIds.size, profile._count?.likes || 0, profile.likes?.length || 0)
    : (profile._count?.likes ?? (profile.likes?.length || 0));

  const displayHistoryCount = isSelf && recentlyPlayed?.length > 0
    ? Math.max(recentlyPlayed.length, profile._count?.history || 0, profile.history?.length || 0)
    : (profile._count?.history ?? (profile.history?.length || 0));

  const displayPlaylistsCount = profile._count?.playlists ?? (profile.playlists?.length || 0);

  const handleToggleFollow = async () => {
    try {
      const res = await api.post(`/users/${profile.id}/follow`);
      setIsFollowing(res.data.following);
    } catch (err) {
      alert('Follow action failed');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-32 animate-fadeIn select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* User Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111114] border border-[#27272A] flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />

        <img
          src={profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.username)}`}
          alt={profile.username}
          className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#18181C] shadow-2xl shrink-0"
        />

        <div className="space-y-3 sm:space-y-4 text-center sm:text-left flex-1 min-w-0">
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-[#1DB954]/20 text-[#1ED760] border border-[#1DB954]/30">
              MUSICFY CITIZEN
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-2 truncate">
              {profile.username}
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">{profile.bio || 'Exploring atmospheric music on Musicfy.'}</p>
          </div>

          {!isSelf && currentUser && (
            <button
              onClick={handleToggleFollow}
              className={`px-5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors mx-auto sm:mx-0 ${
                isFollowing
                  ? 'bg-[#18181C] border-[#1DB954] text-[#1ED760]'
                  : 'bg-[#1ED760] text-black font-bold border-transparent shadow-sm hover:scale-105'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-[#27272A] max-w-md mx-auto sm:mx-0">
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-white">{displayHistoryCount}</p>
              <p className="text-[11px] sm:text-xs text-[#A1A1AA] font-medium">Recent Plays</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-[#1ED760]">{displayLikesCount}</p>
              <p className="text-[11px] sm:text-xs text-[#A1A1AA] font-medium">Liked Songs</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-white">{displayPlaylistsCount}</p>
              <p className="text-[11px] sm:text-xs text-[#A1A1AA] font-medium">Playlists</p>
            </div>
          </div>
        </div>
      </div>

      {/* User's Created Playlists */}
      {profile.playlists?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#1ED760]" />
            Playlists ({profile.playlists.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
            {profile.playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </section>
      )}

      {/* User's Liked Songs Preview */}
      {profile.likes?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#1ED760]" />
            Saved Liked Tracks ({profile.likes.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
            {profile.likes.map((likeItem) => {
              const tr = likeItem.track || likeItem;
              return tr && tr.id ? (
                <TrackCard
                  key={`prof-like-${tr.id}`}
                  track={tr}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ) : null;
            })}
          </div>
        </section>
      )}

      {/* User's Recent Listening History */}
      {profile.history?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#1ED760]" />
            Recent Listening Activity ({profile.history.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
            {profile.history.map((hist) => {
              const tr = hist.track || hist;
              return tr && tr.id ? (
                <TrackCard
                  key={`prof-hist-${tr.id}`}
                  track={tr}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ) : null;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
