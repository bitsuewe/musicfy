import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
  Maximize2,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Plus,
  PanelRight,
  Tv,
  Sun
} from 'lucide-react';

export default function PersistentPlayer() {
  const { user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    toastMessage,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolumeLevel,
    toggleMute,
    setShuffle,
    setRepeatMode,
    toggleLike,
    isLiked,
    queue,
    showSidePlayer,
    toggleSidePlayer,
    isPipActive,
    isPipSupported,
    togglePictureInPicture,
    keepScreenAwake,
    toggleKeepScreenAwake
  } = usePlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // If there is no track or the Side Player is active, do not show the bottom player bar
  if (!currentTrack || showSidePlayer) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 bg-[#1C1C1E]/95 border border-white/20 text-white px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-2 text-xs font-semibold animate-bounce max-w-[85vw]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Apple Music Floating Up Next / Queue Drawer */}
      {showQueue && (
        <div className="fixed bottom-28 sm:bottom-16 right-3 sm:right-6 z-40 w-[calc(100%-1.5rem)] sm:w-80 max-h-[380px] bg-[#1F1F22]/95 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-3xl flex flex-col animate-fadeIn">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-tight">
              <ListMusic className="w-3.5 h-3.5 text-[#10B981]" />
              Playing Next ({queue.length})
            </h3>
            <button
              onClick={() => setShowQueue(false)}
              className="text-[11px] text-[#A1A1AA] hover:text-white font-medium px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
            >
              Done
            </button>
          </div>
          <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 custom-scrollbar">
            {queue.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs transition-all ${
                  item.id === currentTrack.id
                    ? 'bg-white/15 border border-white/20 shadow-sm'
                    : 'hover:bg-white/5'
                }`}
              >
                <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0" />
                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="font-semibold text-white truncate text-[11px]">{item.title}</p>
                  <p className="text-[#A1A1AA] text-[10px] truncate">{item.artistName}</p>
                </div>
                {item.id === currentTrack.id && isPlaying && (
                  <div className="flex items-end gap-0.5 h-2.5 shrink-0">
                    <span className="w-0.5 bg-[#10B981] h-2.5 animate-pulse" />
                    <span className="w-0.5 bg-[#10B981] h-1.5 animate-pulse delay-75" />
                    <span className="w-0.5 bg-[#10B981] h-3 animate-pulse delay-150" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🍎 Apple Music Exact Responsive Bottom Floating Capsule Player */}
      <div className="fixed bottom-16 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 select-none w-[calc(100%-1.25rem)] sm:w-auto max-w-2xl px-1 sm:px-2">
        <div className="relative bg-[#262629]/95 border border-white/15 rounded-2xl px-2.5 sm:px-3.5 py-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center justify-between sm:justify-start gap-2 sm:gap-4 transition-all duration-300">
          
          {/* 1. Left Controls: Shuffle (tablet+), Prev, Play/Pause, Next, Repeat (tablet+) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 text-white shrink-0">
            <button
              onClick={setShuffle}
              className={`p-1 hidden md:flex transition-colors ${shuffle ? 'text-[#10B981]' : 'text-[#8E8E93] hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={playPrev}
              className="p-1 text-[#D1D1D6] hover:text-white transition-colors active:scale-90"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Apple Music Glyph Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1 text-white hover:text-[#10B981] transition-colors active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              className="p-1 text-[#D1D1D6] hover:text-white transition-colors active:scale-90"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={setRepeatMode}
              className={`p-1 hidden md:flex transition-colors ${repeatMode !== 'off' ? 'text-[#10B981]' : 'text-[#8E8E93] hover:text-white'}`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Center Track Block: Artwork, Title/Artist + Progress Bar, PREVIEW badge (guests only), More (...) */}
          <div className="flex items-center gap-2 sm:gap-2.5 bg-black/40 hover:bg-black/50 px-2 sm:px-2.5 py-1.5 rounded-xl border border-white/5 transition-all flex-1 min-w-0 sm:min-w-[240px] md:min-w-[320px] max-w-[420px]">
            
            {/* Thumbnail */}
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              onClick={() => setIsExpanded(true)}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-md object-cover shadow-sm cursor-pointer shrink-0 hover:opacity-90"
            />

            {/* Title, Artist & Progress Bar */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1">
                <p
                  onClick={() => setIsExpanded(true)}
                  className="text-[11px] sm:text-xs font-semibold text-white truncate cursor-pointer hover:underline"
                >
                  {currentTrack.title}
                </p>
              </div>
              
              <p className="text-[9.5px] sm:text-[10.5px] text-[#8E8E93] truncate font-medium">
                {currentTrack.artistName}
              </p>

              {/* Apple Music Thin White Scrubber Bar */}
              <div
                className="relative w-full h-[2px] sm:h-[2.5px] bg-white/20 hover:h-[3.5px] rounded-full cursor-pointer mt-1 group/bar transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekTo(pct * duration);
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white rounded-full shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* PREVIEW Pill Badge — ONLY shown when user is NOT signed in */}
            {!user && (
              <span className="hidden lg:inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold tracking-wider text-[#A1A1A6] bg-white/10 border border-white/10 uppercase select-none shrink-0">
                PREVIEW
              </span>
            )}

            {/* Options Menu Button (...) */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="p-1 text-[#8E8E93] hover:text-white transition-colors"
                title="Options"
              >
                <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Options Dropdown */}
              {showOptionsMenu && (
                <div className="absolute bottom-8 right-0 w-60 bg-[#1F1F22] border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 text-xs z-50 animate-fadeIn">
                  <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-[#34D399] flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping shrink-0" />
                    <span>Background & Lock Screen Ready</span>
                  </div>

                  {/* Floating PiP Background Player */}
                  {isPipSupported && (
                    <button
                      onClick={() => { togglePictureInPicture(); setShowOptionsMenu(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                        isPipActive ? 'bg-[#10B981]/20 text-[#34D399]' : 'hover:bg-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tv className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Floating Background (PiP)</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase text-[#10B981]">
                        {isPipActive ? 'ACTIVE' : 'START'}
                      </span>
                    </button>
                  )}

                  {/* Keep Screen Awake Toggle */}
                  <button
                    onClick={toggleKeepScreenAwake}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center justify-between text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Keep Screen Awake</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase ${keepScreenAwake ? 'text-[#10B981]' : 'text-[#71717A]'}`}>
                      {keepScreenAwake ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    onClick={() => { toggleLike(currentTrack); setShowOptionsMenu(false); }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-white"
                  >
                    <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#10B981] text-[#10B981]' : ''}`} />
                    {liked ? 'Remove from Favs' : 'Add to Favorites'}
                  </button>

                  <a
                    href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowOptionsMenu(false)}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-red-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    YouTube Source
                  </a>

                  <button
                    onClick={() => { setIsExpanded(true); setShowOptionsMenu(false); }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-white"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Fullscreen View
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* 3. Right Controls: Queue list, Volume (tablet+), Side Panel toggle */}
          <div className="flex items-center gap-1 sm:gap-2 text-[#8E8E93] shrink-0">
            {/* Queue */}
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`p-1 transition-colors ${showQueue ? 'text-[#10B981]' : 'hover:text-white'}`}
              title="Playing Next"
            >
              <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Volume Icon with Quick Slider (hidden on mobile, visible on sm+) */}
            <div
              className="relative hidden sm:flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="p-1 hover:text-white transition-colors"
                title="Volume"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Apple Popover Volume Slider */}
              {showVolumeSlider && (
                <div className="absolute bottom-7 -left-10 bg-[#1F1F22] border border-white/15 p-2 rounded-xl shadow-2xl flex items-center gap-2 animate-fadeIn z-50">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolumeLevel(Number(e.target.value))}
                    className="w-20 h-1 bg-white/20 accent-white rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Spotify-Style Side Panel Toggle */}
            <button
              onClick={toggleSidePlayer}
              className="p-1 hover:text-[#10B981] transition-colors"
              title="Open Side Controller Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* 🍏 Fullscreen Atmosphere Mode */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0C]/95 backdrop-blur-3xl p-4 sm:p-8 md:p-12 flex flex-col justify-between animate-fadeIn select-none overflow-y-auto">
          <div className="absolute inset-0 pointer-events-none opacity-50 -z-10 overflow-hidden">
            <img
              src={currentTrack.thumbnail}
              alt=""
              className="w-full h-full object-cover blur-[140px] scale-150 animate-pulse duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
          </div>

          <div className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70">
              Musicfy Atmosphere
            </span>
            <div className="flex items-center gap-2">
              {isPipSupported && (
                <button
                  onClick={togglePictureInPicture}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md backdrop-blur-md ${
                    isPipActive
                      ? 'bg-[#10B981] text-black shadow-[#10B981]/30'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                  }`}
                  title="Multitask in other apps while listening"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>{isPipActive ? 'Floating Active' : 'Float on Apps (PiP)'}</span>
                </button>
              )}
              <button
                onClick={toggleKeepScreenAwake}
                className={`p-2 rounded-full transition-all shadow-md backdrop-blur-md border ${
                  keepScreenAwake
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                    : 'bg-white/10 hover:bg-white/20 text-white/80 border-white/15'
                }`}
                title={keepScreenAwake ? 'Screen Keep-Awake: ON' : 'Screen Keep-Awake: OFF'}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all shadow-lg border border-white/15"
                title="Close"
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          <div className="relative z-10 my-auto flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-10 lg:gap-20 max-w-5xl mx-auto w-full py-6">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-56 h-56 sm:w-72 sm:h-72 md:w-88 md:h-88 rounded-3xl object-cover shadow-[0_30px_90px_rgba(0,0,0,0.8)] border border-white/20"
            />
            <div className="text-center lg:text-left space-y-3 max-w-lg">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-xl text-white/90 border border-white/15 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                  Lossless • Dolby Atmos
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 backdrop-blur-xl shadow-sm">
                  <span>📱 Lock-Screen & Background Play Active</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2">
                {currentTrack.title}
              </h1>
              <p className="text-lg sm:text-xl text-white/70 font-semibold tracking-tight">
                {currentTrack.artistName}
              </p>
            </div>
          </div>

          <div className="relative z-10 max-w-2xl mx-auto w-full pb-4 space-y-4 sm:space-y-6">
            <div className="w-full flex items-center gap-2 sm:gap-3 text-xs font-bold text-white/60">
              <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div
                className="relative flex-1 h-2 bg-white/15 hover:h-2.5 rounded-full cursor-pointer transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekTo(pct * duration);
                }}
              >
                <div
                  className="absolute top-0 left-0 bottom-0 bg-white rounded-full shadow-md"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="w-10 tabular-nums">-{formatTime(Math.max(0, duration - currentTime))}</span>
            </div>

            <div className="flex items-center justify-center gap-8 sm:gap-10">
              <button onClick={playPrev} className="p-2 sm:p-3 text-white/80 hover:text-white active:scale-90 transition-transform">
                <SkipBack className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.4)]"
              >
                {isPlaying ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-black text-black" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black text-black ml-1" />}
              </button>
              <button onClick={playNext} className="p-2 sm:p-3 text-white/80 hover:text-white active:scale-90 transition-transform">
                <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
