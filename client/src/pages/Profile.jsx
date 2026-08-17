import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserCheck, UserPlus, Music, Heart, ListMusic, Sparkles, BarChart2, Radio, History, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from '../components/TrackCard';
import api from '../services/api';

export default function Profile({ onAddToPlaylist }) {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { playTrack } = usePlayer();
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
      setProfile(res.data.user);
    } catch (err) {
      console.error('Fetch profile failed:', err);
      // Fallback to currentUser
      if (currentUser) {
        setProfile({
          id: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`,
          bio: currentUser.bio || 'Musicfy music lover',
          playlists: [],
          likes: [],
          history: [],
          _count: { playlists: 0, likes: 0, followers: 0, following: 0 }
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

  const isSelf = currentUser?.id === profile.id;

  const handleToggleFollow = async () => {
    try {
      const res = await api.post(`/users/${profile.id}/follow`);
      setIsFollowing(res.data.following);
    } catch (err) {
      alert('Follow action failed');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-32 animate-fadeIn select-none">
      {/* User Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111114] border border-[#27272A] flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        <img
          src={profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
          alt={profile.username}
          className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#18181C] shadow-2xl shrink-0"
        />

        <div className="space-y-3 sm:space-y-4 text-center sm:text-left flex-1 min-w-0">
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
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
                  ? 'bg-[#18181C] border-[#10B981] text-[#34D399]'
                  : 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-transparent shadow-sm'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-[#27272A] max-w-md mx-auto sm:mx-0">
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-white">{profile.history?.length || 0}</p>
              <p className="text-[11px] sm:text-xs text-[#A1A1AA] font-medium">Recent Plays</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-[#34D399]">{profile._count?.likes ?? (profile.likes?.length || 0)}</p>
              <p className="text-[11px] sm:text-xs text-[#A1A1AA] font-medium">Liked Songs</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-white">{profile._count?.playlists ?? (profile.playlists?.length || 0)}</p>
              <p className="text-[11px] sm:text-xs text-[#A1A1AA] font-medium">Playlists</p>
            </div>
          </div>
        </div>
      </div>

      {/* User's Created Playlists */}
      {profile.playlists?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#34D399]" />
            Playlists ({profile.playlists.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {profile.playlists.map((pl) => (
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
                <p className="text-[10px] sm:text-xs text-[#A1A1AA]">{pl.tracks?.length || 0} tracks</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* User's Liked Songs Preview */}
      {profile.likes?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#34D399]" />
            Saved Liked Tracks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {profile.likes.map((likeItem) => (
              likeItem.track && (
                <TrackCard
                  key={likeItem.id || likeItem.track.id}
                  track={likeItem.track}
                  onAddToPlaylist={onAddToPlaylist}
                />
              )
            ))}
          </div>
        </section>
      )}

      {/* User's Recent Listening History */}
      {profile.history?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#34D399]" />
            Recent Listening Activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {profile.history.map((hist) => (
              hist.track && (
                <TrackCard
                  key={`hist-${hist.id || hist.track.id}`}
                  track={hist.track}
                  onAddToPlaylist={onAddToPlaylist}
                />
              )
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
