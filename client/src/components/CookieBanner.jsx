import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check, ShieldCheck } from 'lucide-react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('musicfy_cookie_consent');
      if (!consent) {
        // Show after a brief delay for a polished entrance
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // If localStorage is unavailable, do nothing
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('musicfy_cookie_consent', 'all');
    } catch {}
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('musicfy_cookie_consent', 'essential');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 md:bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] animate-slideUp">
      <div className="bg-[#18181C]/98 border border-white/15 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl text-white relative">
        <button
          onClick={handleEssentialOnly}
          className="absolute top-3 right-3 text-[#71717A] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss (Essential only)"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-9 h-9 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center text-[#1DB954] shrink-0 mt-0.5 shadow-sm">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-white">We Respect Your Privacy</h4>
              <span className="text-[10px] uppercase font-bold bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded">
                Cookies
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
              Musicfy uses essential cookies and local browser storage to keep you signed in, remember your volume and queue, and enable offline track caching.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
          <button
            onClick={handleAcceptAll}
            className="flex-1 py-2 px-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Accept All</span>
          </button>
          <button
            onClick={handleEssentialOnly}
            className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
          >
            Essential Only
          </button>
          <Link
            to="/terms#cookies"
            onClick={() => setVisible(false)}
            className="text-[11px] text-[#A1A1AA] hover:text-[#1DB954] hover:underline px-2 transition-colors"
          >
            Preferences
          </Link>
        </div>
      </div>
    </div>
  );
}
