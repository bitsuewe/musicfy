import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Flame, Music, User, Radio, Sparkles, History, X, Trash2 } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import TrackRow from '../components/TrackRow';
import api from '../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All Results' },
  { id: 'tracks', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
];

const TRENDING_KEYWORDS = ['The Weeknd', 'Synthwave', 'Harry Styles', 'Coldplay', 'Billie Eilish', 'Taylor Swift', 'Lo-Fi Chill'];
const SEARCH_HISTORY_KEY = 'spicify_search_history';

export default function Discover({ onAddToPlaylist }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearch(query);
      if (query.trim()) {
        saveSearchQuery(query.trim());
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, category]);

  const saveSearchQuery = (q) => {
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== q.toLowerCase());
      const updated = [q, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const removeHistoryItem = (e, itemToRemove) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {}
  };

  const fetchSearch = async (q) => {
    setLoading(true);
    try {
      const res = await api.get(`/music/search`, {
        params: { q, category }
      });
      setResults(res.data.tracks || []);
    } catch (err) {
      console.error('Search request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordClick = (kw) => {
    setQuery(kw);
    setSearchParams({ q: kw });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32 animate-fadeIn select-none">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">Discover Music</h1>
        <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 font-medium">
          Search across millions of YouTube music tracks, artists, and live channels.
        </p>
      </div>

      {/* Category Pills & View Mode */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  category === cat.id
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'bg-[#111114] text-[#A1A1AA] border border-[#27272A] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#111114] border border-[#27272A] rounded-xl text-xs shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold ${viewMode === 'grid' ? 'bg-[#27272A] text-white' : 'text-[#A1A1AA]'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold ${viewMode === 'list' ? 'bg-[#27272A] text-white' : 'text-[#A1A1AA]'}`}
            >
              List
            </button>
          </div>
        </div>

        {/* 🕒 Search History Section */}
        {searchHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#10B981]" />
                Recent Searches
              </span>
              <button
                onClick={clearAllHistory}
                className="text-[11px] text-[#71717A] hover:text-red-400 font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {searchHistory.map((item) => (
                <div
                  key={item}
                  onClick={() => handleKeywordClick(item)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#10B981]/50 text-xs text-white hover:text-[#10B981] cursor-pointer transition-all shrink-0"
                >
                  <span>{item}</span>
                  <button
                    onClick={(e) => removeHistoryItem(e, item)}
                    className="opacity-60 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5"
                    title="Remove from history"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Keywords */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1 shrink-0">
            <Flame className="w-3.5 h-3.5 text-[#34D399]" />
            Trending:
          </span>
          {TRENDING_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => handleKeywordClick(kw)}
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#111114] border border-[#27272A] hover:border-[#10B981] text-[11px] sm:text-xs text-[#A1A1AA] hover:text-white shrink-0 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square bg-[#111114] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Music className="w-12 h-12 text-[#27272A] mx-auto" />
          <h3 className="text-lg font-bold text-white">No tracks found</h3>
          <p className="text-xs text-[#A1A1AA]">Try searching for a different song title or artist name.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {results.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1 bg-[#111114] border border-[#27272A] rounded-2xl p-2">
          {results.map((track, i) => (
            <TrackRow
              key={track.id}
              index={i}
              track={track}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
