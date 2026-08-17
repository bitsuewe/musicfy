import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Library, PlusSquare, Users, ShieldAlert, Sparkles, LogOut, User, Radio, Music2, ListMusic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAllPlaylists } from '../services/playlistStorage';

export default function Sidebar({ onRequestCreatePlaylist, onRequestAuth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    loadPlaylists();

    const handleUpdate = () => loadPlaylists();
    window.addEventListener('spicify_playlists_updated', handleUpdate);
    return () => window.removeEventListener('spicify_playlists_updated', handleUpdate);
  }, [user]);

  const loadPlaylists = () => {
    fetchAllPlaylists(user)
      .then(list => setPlaylists(list))
      .catch(() => {});
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${isActive
      ? 'bg-[#282828] text-[#1DB954] shadow-sm'
      : 'text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A]'
    }`;

  return (
    <aside className="w-60 lg:w-64 bg-[#000000] border-r border-[#282828] flex flex-col h-full select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 pb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center spotify-glow-sm shrink-0">
          <Music2 className="w-4 h-4 text-black fill-black" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1">
            Musicfy
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#1DB954]">
            your Music universe
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 py-1 space-y-1">
        <NavLink to="/" className={navItemClass}>
          <Home className="w-4 h-4" />
          Home
        </NavLink>
        <NavLink to="/discover" className={navItemClass}>
          <Compass className="w-4 h-4" />
          Search
        </NavLink>
        <NavLink to="/library" className={navItemClass}>
          <Library className="w-4 h-4" />
          Your Library
        </NavLink>
      </div>

      <div className="my-2 mx-4 border-t border-[#282828]" />

      {/* Playlists & Library Section */}
      <div className="px-3 py-1 flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B3B3B3]">
            Playlists
          </span>
          <button
            onClick={onRequestCreatePlaylist}
            className="p-1 rounded-full text-[#B3B3B3] hover:text-[#1DB954] hover:bg-[#282828] transition-colors"
            title="Create Playlist"
          >
            <PlusSquare className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <NavLink to="/playlist/liked" className={navItemClass}>
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-600 to-[#1DB954] flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="truncate">Liked Songs</span>
          </NavLink>

          {/* User's Actual Created Playlists */}
          {playlists.map((pl) => (
            <NavLink
              key={pl.id}
              to={`/playlist/${pl.id}`}
              className={navItemClass}
            >
              <div className="w-5 h-5 rounded bg-[#18181C] border border-white/10 flex items-center justify-center shrink-0">
                <ListMusic className="w-3 h-3 text-[#1DB954]" />
              </div>
              <span className="truncate">{pl.title}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-5 mb-2 px-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B3B3B3]">
            Social Feed
          </span>
        </div>
        <NavLink to="/social" className={navItemClass}>
          <Users className="w-4 h-4" />
          Friend Activity
        </NavLink>

        {user?.role === 'ADMIN' && (
          <div className="mt-3">
            <NavLink to="/admin" className={navItemClass}>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Admin Portal
            </NavLink>
          </div>
        )}
      </div>

      {/* Footer User Profile */}
      <div className="p-3.5 border-t border-[#282828] bg-[#121212] shrink-0">
        {user ? (
          <div className="flex items-center justify-between">
            <div
              onClick={() => navigate(`/profile/${user.id}`)}
              className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
            >
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.username}
                className="w-8 h-8 rounded-full bg-[#282828] border border-[#3E3E3E] object-cover group-hover:border-[#1DB954] transition-colors shrink-0"
              />
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-white truncate group-hover:text-[#1DB954]">
                  {user.username}
                </p>
                <p className="text-[10px] text-[#B3B3B3] truncate">View Profile</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-[#B3B3B3] hover:text-red-400 hover:bg-[#282828] rounded-lg transition-colors shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onRequestAuth}
            className="w-full py-2 px-3 rounded-full bg-[#1DB954] text-black font-black text-xs hover:scale-105 transition-transform spotify-glow-sm flex items-center justify-center gap-2"
          >
            <User className="w-3.5 h-3.5 fill-black" />
            Log In / Sign Up
          </button>
        )}
      </div>
    </aside>
  );
}
