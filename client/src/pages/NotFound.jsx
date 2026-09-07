import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music2, Home, Compass, ArrowLeft, Disc3, Radio } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-white flex flex-col items-center justify-between p-6 select-none font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Brand Header */}
      <header className="w-full max-w-6xl flex items-center justify-between py-4">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Music2 className="w-5 h-5 text-black fill-black" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">Musicfy</span>
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all border border-white/5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </header>

      {/* Main 404 Card / Center Content */}
      <main className="flex flex-col items-center text-center max-w-lg mx-auto my-auto py-8">
        {/* Animated Vinyl Graphic */}
        <div className="relative mb-8 group">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-[#121216] via-[#1a1a22] to-[#27272a] p-3 shadow-2xl border border-white/10 flex items-center justify-center relative animate-[spin_12s_linear_infinite]">
            {/* Vinyl Grooves */}
            <div className="w-full h-full rounded-full border border-white/5 flex items-center justify-center">
              <div className="w-3/4 h-3/4 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-1/2 h-1/2 rounded-full border border-white/15 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-inner">
                    <div className="w-3 h-3 rounded-full bg-[#09090B]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Floating needle badge */}
          <div className="absolute -bottom-2 -right-2 bg-[#18181C] border border-white/10 rounded-full p-2.5 shadow-xl text-[#1DB954] flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Status Code Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E22134]/15 border border-[#E22134]/40 text-[#F15E6C] text-xs font-black uppercase tracking-wider mb-4">
          <span>Error 404 • Track Missing</span>
        </div>

        {/* Title and Message */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
          Lost in the Mix
        </h1>
        <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed mb-8">
          The track, playlist, or page you’re looking for seems to have skipped off the record or doesn’t exist in our catalog.
        </p>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-black" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/discover"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm border border-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#1DB954]" />
            <span>Discover Music</span>
          </Link>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="text-center py-4 text-xs text-[#71717A]">
        <p>© {new Date().getFullYear()} Musicfy • Premium Audio Experience</p>
      </footer>
    </div>
  );
}
