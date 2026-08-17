import React from 'react';
import { Play, Pause, Heart, Plus, ListPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function TrackRow({ index, track, onAddToPlaylist, onRemove }) {
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleLike, isLiked, addToQueue } = usePlayer();

  const isCurrent = currentTrack?.id === track.id;
  const liked = isLiked(track.id);

  const formatTime = (secs) => {
    if (!secs) return '3:30';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={() => playTrack(track)}
      className={`group flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors cursor-pointer select-none ${
        isCurrent ? 'bg-white/10 text-[#10B981]' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Index or Play Icon */}
        <div className="w-6 text-center text-sm font-semibold text-[#A1A1AA] group-hover:hidden">
          {isCurrent && isPlaying ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block animate-pulse" />
          ) : (
            index + 1
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isCurrent) togglePlay();
            else playTrack(track);
          }}
          className="w-6 hidden group-hover:flex items-center justify-center text-white"
        >
          {isCurrent && isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        {/* Artwork Thumbnail */}
        <img
          src={track.thumbnail}
          alt=""
          className="w-10 h-10 rounded-lg object-cover bg-[#282828] shadow-sm"
        />

        {/* Info */}
        <div className="overflow-hidden min-w-0 flex-1">
          <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-[#10B981]' : 'text-white'}`}>
            {track.title}
          </h4>
          <p className="text-xs text-[#A1A1AA] truncate font-medium">{track.artistName}</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 text-xs text-[#A1A1AA]">
        <button
          onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
          className="p-1 hover:text-[#10B981] transition-colors"
          title="Add to Queue"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
          className="p-1 hover:text-[#10B981] transition-colors"
          title="Like"
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-[#10B981] text-[#10B981]' : ''}`} />
        </button>

        {onAddToPlaylist && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }}
            className="p-1 hover:text-white transition-colors"
            title="Add to Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(track.id); }}
            className="p-1 hover:text-red-400 transition-colors text-xs font-bold"
          >
            Remove
          </button>
        )}

        <span className="w-10 text-right font-medium tabular-nums">{formatTime(track.durationSec)}</span>
      </div>
    </div>
  );
}
