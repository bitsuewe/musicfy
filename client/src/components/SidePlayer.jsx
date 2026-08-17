import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  X,
  Heart,
  ListMusic,
  Plus,
  Trash2,
  ExternalLink,
  Radio,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  ArrowDownRight
} from 'lucide-react';

export default function SidePlayer({ onAddToPlaylist }) {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    playNext,
    playPrev,
    playTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    setShuffle,
    setRepeatMode,
    toggleLike,
    isLiked,
    removeFromQueue,
    clearQueue,
    showSidePlayer,
    setShowSidePlayer,
    autoPlaySimilar,
    setAutoPlaySimilar
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('now_playing'); // 'now_playing' | 'queue'

  if (!showSidePlayer || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const upcomingQueue = queue.slice(currentIndex + 1);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Mobile Dark Backdrop */}
      <div
        onClick={() => setShowSidePlayer(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
      />

      <aside className="fixed md:relative top-0 bottom-0 right-0 z-50 md:z-30 w-full sm:w-88 md:w-80 lg:w-96 h-full bg-[#121216]/98 border-l border-white/10 backdrop-blur-3xl flex flex-col p-4 shrink-0 select-none shadow-2xl animate-fadeIn">
        
        {/* 🔝 Top Header Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('now_playing')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'now_playing' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Now Playing
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'queue' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Queue ({queue.length})
            </button>
          </div>

          <button
            onClick={() => setShowSidePlayer(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#71717A] hover:text-white transition-colors"
            title="Dock to bottom player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 📜 Middle Content Area (Tab Content) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0">
          
          {/* Tab 1: Now Playing Details */}
          {activeTab === 'now_playing' && (
            <div className="space-y-4">
              
              {/* Artwork Card */}
              <div className="relative group rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 backdrop-blur-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#10B981]" />
                    Playing Live
                  </span>
                  <button
                    onClick={() => toggleLike(currentTrack)}
                    className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-[#10B981] transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-[#10B981] text-[#10B981]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Song Meta */}
              <div>
                <h3 className="text-lg font-extrabold text-white truncate tracking-tight">
                  {currentTrack.title}
                </h3>
                <p className="text-sm text-[#A1A1AA] font-semibold truncate hover:text-white cursor-pointer mt-0.5">
                  {currentTrack.artistName}
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddToPlaylist && onAddToPlaylist(currentTrack)}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Playlist
                </button>
                <a
                  href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-xs font-bold text-red-400 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  YouTube Video
                </a>
              </div>

              {/* About the Artist Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#A1A1AA]">
                  About the Artist
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={currentTrack.thumbnail}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover shadow-sm"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{currentTrack.artistName}</p>
                    <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#10B981]" />
                      {currentTrack.viewCount || '10M+'} plays
                    </p>
                  </div>
                </div>
              </div>

              {/* Background & Lock-Screen Play Status */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#10B981]/10 to-transparent border border-[#10B981]/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-white leading-tight">Background Play Active</p>
                    <p className="text-[10px] text-[#A1A1AA]">Lock screen & switch apps freely</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                  ON
                </span>
              </div>

              {/* Next in Queue Preview */}
              {upcomingQueue.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#18181C] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#A1A1AA]">
                    <span>NEXT IN QUEUE</span>
                    <button
                      onClick={() => setActiveTab('queue')}
                      className="text-[#34D399] hover:underline"
                    >
                      View All ({queue.length})
                    </button>
                  </div>
                  <div
                    onClick={() => playNext()}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <img src={upcomingQueue[0].thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-white truncate">{upcomingQueue[0].title}</p>
                      <p className="text-[11px] text-[#A1A1AA] truncate">{upcomingQueue[0].artistName}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Tab 2: Queue Management */}
          {activeTab === 'queue' && (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoPlaySimilar}
                    onChange={setAutoPlaySimilar}
                    className="rounded bg-[#27272A] border-none text-[#10B981] focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-[11px]">Autoplay Similar Songs</span>
                </label>

                {queue.length > 1 && (
                  <button
                    onClick={clearQueue}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {/* Now Playing Item */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#10B981] mb-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                  Now Playing
                </p>
                <div className="flex items-center gap-3 p-2 rounded-xl bg-white/10 border border-white/15 shadow-sm">
                  <img src={currentTrack.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-white text-xs truncate">{currentTrack.title}</p>
                    <p className="text-[#A1A1AA] text-[11px] truncate">{currentTrack.artistName}</p>
                  </div>
                </div>
              </div>

              {/* Upcoming Queue List */}
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#A1A1AA] pt-1">
                Next in Queue ({upcomingQueue.length})
              </p>

              {upcomingQueue.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#71717A] space-y-1">
                  <p>Queue is empty</p>
                  <p className="text-[11px] text-[#A1A1AA]">
                    {autoPlaySimilar ? '✨ Autoplay will continue similar songs automatically.' : 'Add songs with "+".'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcomingQueue.map((item, index) => {
                    const actualIndex = currentIndex + 1 + index;
                    return (
                      <div
                        key={`${item.id}-${actualIndex}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 group transition-colors"
                      >
                        <div
                          onClick={() => playTrack(item)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-white text-xs truncate group-hover:text-[#10B981] transition-colors">
                              {item.title}
                            </p>
                            <p className="text-[#A1A1AA] text-[10px] truncate">{item.artistName}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromQueue(actualIndex)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#71717A] hover:text-red-400 rounded-md transition-all"
                          title="Remove from Queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 🎛️ Bottom Dedicated Full Side Player Music Controller */}
        <div className="pt-3 border-t border-white/10 space-y-3 shrink-0 bg-[#121216]/50">
          
          {/* Seek Scrubber Bar */}
          <div className="space-y-1">
            <div
              className="relative w-full h-1.5 bg-white/15 hover:h-2 rounded-full cursor-pointer group transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seekTo(pct * duration);
              }}
            >
              <div
                className="absolute top-0 left-0 bottom-0 bg-[#10B981] rounded-full shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${progressPercent}% - 6px)` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-[#A1A1AA] tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
            </div>
          </div>

          {/* Primary Playback Transport Controls */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={setShuffle}
              className={`p-1.5 rounded-full transition-all text-xs ${
                shuffle ? 'text-[#10B981] bg-[#10B981]/15' : 'text-[#71717A] hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={playPrev}
              className="text-[#D4D4D8] hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all active:scale-90"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Large Pill Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.3)]"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black text-black" />
              ) : (
                <Play className="w-5 h-5 fill-black text-black ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              className="text-[#D4D4D8] hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all active:scale-90"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={setRepeatMode}
              className={`p-1.5 rounded-full transition-all text-xs ${
                repeatMode !== 'off' ? 'text-[#10B981] bg-[#10B981]/15' : 'text-[#71717A] hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume & Dock Controls */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 flex-1 max-w-[160px]">
              <button
                onClick={toggleMute}
                className="text-[#71717A] hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(Number(e.target.value))}
                className="w-full h-1 bg-white/20 accent-[#10B981] rounded-lg cursor-pointer transition-all"
              />
            </div>

            <button
              onClick={() => setShowSidePlayer(false)}
              className="text-[11px] font-bold text-[#A1A1AA] hover:text-[#10B981] flex items-center gap-1 hover:underline"
              title="Switch to Bottom Floating Capsule"
            >
              Dock to bottom
              <ArrowDownRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </aside>
    </>
  );
}
