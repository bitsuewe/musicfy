import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Bell, User, LogIn, ChevronLeft, ChevronRight, X, Command } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Navbar({ onRequestAuth }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/social/notifications')
        .then(res => setNotifications(res.data.notifications || []))
        .catch(() => {});
    }
  }, [user]);

  // Synchronize input when URL search query changes (e.g. clicking trending or history chips)
  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    setQuery(urlQ);
  }, [searchParams]);

  // Live debounced search navigation
  useEffect(() => {
    const trimmed = query.trim();
    const currentUrlQ = searchParams.get('q') || '';

    if (trimmed === currentUrlQ) return;

    const timer = setTimeout(() => {
      if (trimmed) {
        navigate(`/discover?q=${encodeURIComponent(trimmed)}`, { replace: location.pathname === '/discover' });
      } else if (location.pathname === '/discover' && currentUrlQ) {
        navigate('/discover', { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, navigate, location.pathname, searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (location.pathname === '/discover') {
      navigate('/discover', { replace: true });
    }
  };

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] flex items-center justify-between sticky top-0 z-20 select-none gap-2">
      {/* Back / Forward Navigation & Unified Global Search Bar */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#111114] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition-colors"
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-xl bg-[#111114] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition-colors"
            title="Go Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Top Search Bar across entire Musicfy application */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm sm:max-w-md md:max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            id="musicfy-header-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, genres... (Press / to search)"
            className="w-full pl-10 pr-16 py-2 rounded-xl bg-[#141417] border border-[#27272A] text-xs sm:text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/40 transition-all shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#71717A] bg-[#27272A]/60 border border-white/5 pointer-events-none">
                /
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 sm:p-2.5 rounded-xl bg-[#111114] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#10B981] transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10B981]" />
              )}
            </button>

            {/* Notification Popup */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-[#111114] border border-[#27272A] rounded-2xl p-4 shadow-2xl z-30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-3">
                  Notifications
                </h4>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#A1A1AA]">No new notifications.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="p-2 rounded-xl bg-[#18181C] text-xs text-white">
                        {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {user ? (
          <button
            onClick={() => navigate(`/profile/${user.id}`)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111114] border border-[#27272A] hover:border-[#10B981] transition-colors"
          >
            <img
              src={user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
              alt=""
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#18181C] object-cover"
            />
            <span className="text-xs font-semibold text-white max-w-[80px] sm:max-w-[120px] truncate">{user.username}</span>
          </button>
        ) : loading ? (
          <div className="w-20 h-8 rounded-xl bg-[#111114] animate-pulse" />
        ) : (
          <button
            onClick={onRequestAuth}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
