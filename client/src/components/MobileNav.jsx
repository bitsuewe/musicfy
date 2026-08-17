import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Library, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav({ onRequestCreatePlaylist, onRequestAuth }) {
  const { user } = useAuth();

  const navClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
      isActive ? 'text-[#34D399]' : 'text-[#A1A1AA] hover:text-white'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111114]/95 backdrop-blur-xl border-t border-[#27272A] px-4 py-2 flex items-center justify-around">
      <NavLink to="/" className={navClass}>
        <Home className="w-5 h-5" />
        <span>Home</span>
      </NavLink>

      <NavLink to="/discover" className={navClass}>
        <Search className="w-5 h-5" />
        <span>Search</span>
      </NavLink>

      <button
        onClick={user ? onRequestCreatePlaylist : onRequestAuth}
        className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#10B981] hover:text-[#34D399]"
      >
        <PlusCircle className="w-6 h-6 text-[#34D399]" />
        <span>Create</span>
      </button>

      <NavLink to="/library" className={navClass}>
        <Library className="w-5 h-5" />
        <span>Library</span>
      </NavLink>

      <NavLink
        to={user ? `/profile/${user.id}` : '#'}
        onClick={(e) => {
          if (!user) {
            e.preventDefault();
            onRequestAuth();
          }
        }}
        className={navClass}
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
