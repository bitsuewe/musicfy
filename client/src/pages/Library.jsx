import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart,
  Plus,
  ListMusic,
  Clock,
  Sparkles,
  Download,
  HardDrive,
  Play,
  Settings,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from '../components/TrackCard';
import PlaylistCard from '../components/PlaylistCard';
import TrackRow from '../components/TrackRow';
import { fetchAllPlaylists } from '../services/playlistStorage';
import {
  getAllDownloadedTracks,
  getOfflineStorageUsage,
  getOfflineSettings,
  updateOfflineSettings,
  clearAutoCachedTracks,
  subscribeToStorageUpdates
} from '../services/webOfflineStorage';
import { syncWebSmartDownloads } from '../services/webSmartDownloadEngine';
import api from '../services/api';

export default function Library({ onRequestCreatePlaylist, onAddToPlaylist }) {
  const { user } = useAuth();
  const { playTrack, playOfflineQueue } = usePlayer();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [downloadSubTab, setDownloadSubTab] = useState('all'); // 'all' | 'pinned' | 'smart'
  const [playlists, setPlaylists] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Offline storage state
  const [downloadedData, setDownloadedData] = useState({ manualTracks: [], autoCachedTracks: [], allTracks: [] });
  const [storageUsage, setStorageUsage] = useState(null);
  const [offlineSettings, setOfflineSettings] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    fetchLibrary();
    loadOfflineData();

    const handleUpdate = () => fetchLibrary();
    window.addEventListener('spicify_playlists_updated', handleUpdate);

    const unsubStorage = subscribeToStorageUpdates(() => {
      loadOfflineData();
    });

    return () => {
      window.removeEventListener('spicify_playlists_updated', handleUpdate);
      unsubStorage();
    };
  }, [user]);

  const loadOfflineData = async () => {
    try {
      const data = await getAllDownloadedTracks();
      const usage = await getOfflineStorageUsage();
      const settings = await getOfflineSettings();
      setDownloadedData(data);
      setStorageUsage(usage);
      setOfflineSettings(settings);
    } catch (e) {}
  };

  const handleClearAutoCache = async () => {
    if (window.confirm('Clear all smart auto-cached songs? Your manually pinned downloads will remain safe.')) {
      await clearAutoCachedTracks();
      loadOfflineData();
    }
  };

  const toggleSmartLimit = async (limit) => {
    const next = await updateOfflineSettings({ smartDownloadLimit: limit });
    setOfflineSettings(next);
    syncWebSmartDownloads().catch(() => {});
  };

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const allPlaylists = await fetchAllPlaylists(user);
      setPlaylists(allPlaylists);

      let likes = [];
      try {
        const likeRes = await api.get('/likes');
        likes = (likeRes.data.likes || []).map(l => l.track).filter(Boolean);
      } catch (e) {}

      if (likes.length === 0 && user?.id) {
        try {
          const userKey = `musicfy_likes_${user.id}`;
          const rawLocal = localStorage.getItem(userKey);
          if (rawLocal) likes = JSON.parse(rawLocal);
        } catch (e) {}
      }
      setLikedCount(likes.length);

      let histTracks = [];
      try {
        const histRes = await api.get('/history');
        histTracks = (histRes.data.history || []).map(f => f.track).filter(Boolean);
      } catch (e) {}

      if (histTracks.length === 0 && user?.id) {
        try {
          const userKey = `musicfy_recents_${user.id}`;
          const rawLocal = localStorage.getItem(userKey);
          if (rawLocal) histTracks = JSON.parse(rawLocal);
        } catch (e) {}
      }
      setHistory(histTracks);
    } catch (err) {
      console.error('Fetch library failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOfflineTracks = () => {
    if (downloadSubTab === 'pinned') return downloadedData.manualTracks;
    if (downloadSubTab === 'smart') return downloadedData.autoCachedTracks;
    return downloadedData.allTracks;
  };

  const displayedOfflineTracks = getFilteredOfflineTracks();

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">Your Library</h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 font-medium">
            {storageUsage && storageUsage.totalCount > 0
              ? `${storageUsage.totalCount} Songs Offline (${storageUsage.formattedTotal}) • Saved playlists & history`
              : 'Your saved tracks, custom playlists, and offline music collection.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-white/10 transition-colors"
            title="Offline Storage Settings"
          >
            <Settings className="w-4 h-4 text-[#10B981]" />
            <span className="hidden sm:inline">Offline Settings</span>
          </button>
          <button
            onClick={onRequestCreatePlaylist}
            className="px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#34D399] text-white font-semibold text-xs flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Playlist
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'downloads', label: `Offline Downloads (${downloadedData.allTracks.length})`, icon: Download },
          { id: 'playlists', label: 'Playlists' },
          { id: 'history', label: 'Recently Played' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold capitalize transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📥 OFFLINE DOWNLOADS DEDICATED VIEW */}
      {activeTab === 'downloads' && (
        <section className="space-y-6">
          {/* Hero Banner */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#10B981]/15 to-emerald-900/10 border border-[#10B981]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#10B981] text-xs font-extrabold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Dolby Atmos Offline Engine Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {downloadedData.allTracks.length > 0
                  ? `${downloadedData.allTracks.length} Songs Ready For Offline Playback`
                  : 'Your Offline Collection is Ready'}
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
                {storageUsage ? `${storageUsage.formattedTotal} used on device • Works with zero Wi-Fi or mobile data.` : ''}
              </p>
            </div>

            {downloadedData.allTracks.length > 0 && (
              <button
                onClick={() => playOfflineQueue(downloadSubTab === 'smart')}
                className="px-5 py-3 rounded-xl bg-[#10B981] text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-[#10B981]/30 hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play All Offline</span>
              </button>
            )}
          </div>

          {/* Sub-Filters: All, Pinned, Smart Mix */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDownloadSubTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                downloadSubTab === 'all' ? 'bg-white text-black' : 'bg-[#18181C] text-[#A1A1AA] hover:text-white'
              }`}
            >
              All ({downloadedData.allTracks.length})
            </button>
            <button
              onClick={() => setDownloadSubTab('pinned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                downloadSubTab === 'pinned' ? 'bg-white text-black' : 'bg-[#18181C] text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span>Pinned Downloads ({downloadedData.manualTracks.length})</span>
            </button>
            <button
              onClick={() => setDownloadSubTab('smart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                downloadSubTab === 'smart' ? 'bg-[#10B981] text-black font-bold' : 'bg-[#18181C] text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Smart Offline Mix ({downloadedData.autoCachedTracks.length})</span>
            </button>
          </div>

          {/* Offline Tracks Table */}
          {displayedOfflineTracks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#111114] rounded-2xl border border-white/5 space-y-3">
              <Download className="w-10 h-10 text-[#71717A] mx-auto" />
              <h3 className="text-base font-bold text-white">
                {downloadSubTab === 'smart' ? 'Smart Auto-Downloads Preparing' : 'No Offline Tracks Here Yet'}
              </h3>
              <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                {downloadSubTab === 'smart'
                  ? 'Listen to songs or like them, and Musicfy will automatically download your top 50 favorites in the background!'
                  : 'Tap the download icon on any song, album, or search result to save it for offline listening.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayedOfflineTracks.map((track, i) => (
                <TrackRow key={`off-${track.id}-${i}`} index={i} track={track} onAddToPlaylist={onAddToPlaylist} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Main Content Grid (Playlists & Special Tiles) */}
      {(activeTab === 'all' || activeTab === 'playlists') && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-4">
            Playlists & Offline Collections
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
            
            {/* Liked Songs Special Card */}
            <div
              onClick={() => navigate('/playlist/liked')}
              className="group relative p-3.5 sm:p-4 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer flex flex-col select-none transition-all duration-300 border border-transparent hover:border-white/5"
            >
              <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3.5 bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow">
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 drop-shadow-xl z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/playlist/liked'); }}
                    className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                    title="Play Liked Songs"
                  >
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  </button>
                </div>
              </div>
              <div className="overflow-hidden space-y-1 min-h-[44px]">
                <h4 className="text-sm font-bold truncate text-white leading-tight">Liked Songs</h4>
                <p className="text-xs text-[#B3B3B3] truncate font-normal leading-tight">{likedCount} saved track{likedCount === 1 ? '' : 's'}</p>
              </div>
            </div>

            {/* Offline Music Special Card */}
            <div
              onClick={() => setActiveTab('downloads')}
              className="group relative p-3.5 sm:p-4 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer flex flex-col select-none transition-all duration-300 border border-transparent hover:border-white/5"
            >
              <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3.5 bg-gradient-to-br from-[#054338] to-[#1DB954] flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow">
                <Download className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                {downloadedData.allTracks.length > 0 && (
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 drop-shadow-xl z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); playOfflineQueue(false); }}
                      className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                      title="Play Offline Songs"
                    >
                      <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-hidden space-y-1 min-h-[44px]">
                <h4 className="text-sm font-bold truncate text-white leading-tight">Downloaded</h4>
                <p className="text-xs text-[#B3B3B3] truncate font-normal leading-tight">{downloadedData.allTracks.length} offline track{downloadedData.allTracks.length === 1 ? '' : 's'}</p>
              </div>
            </div>

            {/* Custom User Playlists */}
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      {(activeTab === 'all' || activeTab === 'history') && history.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1ED760]" />
            Recently Played
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
            {history.slice(0, 12).map((track, i) => (
              <TrackCard key={`hist-${track.id}-${i}`} track={track} onAddToPlaylist={onAddToPlaylist} />
            ))}
          </div>
        </section>
      )}

      {/* ⚙️ OFFLINE STORAGE SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181C] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <HardDrive className="w-5 h-5 text-[#10B981]" />
                <span>Offline Storage & Cache</span>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storage Meter */}
            {storageUsage && (
              <div className="p-4 rounded-xl bg-[#202025] border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>Total Offline Storage</span>
                  <span className="text-[#10B981]">{storageUsage.formattedTotal}</span>
                </div>
                <div className="text-xs text-[#A1A1AA] flex justify-between pt-1 border-t border-white/5">
                  <span>Pinned: {storageUsage.manualCount} tracks</span>
                  <span>{storageUsage.formattedManual}</span>
                </div>
                <div className="text-xs text-[#34D399] flex justify-between">
                  <span>Smart Auto-Cache: {storageUsage.autoCachedCount} tracks</span>
                  <span>{storageUsage.formattedAuto}</span>
                </div>
              </div>
            )}

            {/* Smart Auto-Downloads Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">Smart Auto-Downloads</p>
                <p className="text-xs text-[#A1A1AA]">Automatically caches your top listened songs</p>
              </div>
              <input
                type="checkbox"
                checked={offlineSettings?.smartDownloadEnabled ?? true}
                onChange={async (e) => {
                  const next = await updateOfflineSettings({ smartDownloadEnabled: e.target.checked });
                  setOfflineSettings(next);
                  if (e.target.checked) syncWebSmartDownloads().catch(() => {});
                }}
                className="w-5 h-5 accent-[#10B981] rounded cursor-pointer"
              />
            </div>

            {/* Limit (50 vs 100) */}
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <div>
                <p className="text-sm font-bold text-white">Auto-Cache Limit</p>
                <p className="text-xs text-[#A1A1AA]">Number of songs to keep offline</p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#202025] p-1 rounded-xl">
                {[50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => toggleSmartLimit(num)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      offlineSettings?.smartDownloadLimit === num
                        ? 'bg-[#10B981] text-black'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    {num} Songs
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Auto Cache */}
            <button
              onClick={handleClearAutoCache}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Smart Auto-Cache ({storageUsage?.formattedAuto || '0 MB'})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
