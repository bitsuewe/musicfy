import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Bell, User, LogIn, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Navbar({ onRequestAuth }) {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#09090B]/90 backdrop-blur-xl border-b border-[#27272A] flex items-center justify-between sticky top-0 z-20 select-none gap-2">
      {/* Back / Forward Navigation & Search */}
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

        {/* Responsive Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists..."
            className="w-full pl-9 sm:pl-10 pr-8 py-1.5 sm:py-2 rounded-xl bg-[#111114] border border-[#27272A] text-xs sm:text-sm text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#10B981] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); navigate('/discover'); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
              src={user.avatarUrl}
              alt=""
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#18181C] object-cover"
            />
            <span className="text-xs font-semibold text-white max-w-[80px] sm:max-w-[120px] truncate">{user.username}</span>
          </button>
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
