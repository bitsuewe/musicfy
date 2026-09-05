import React from 'react';
import { Play, Pause, Heart, Plus, ListPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import DownloadButton from './DownloadButton';

export default function TrackCard({ track, onAddToPlaylist }) {
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleLike, isLiked, addToQueue } = usePlayer();

  if (!track) return null;

  const isCurrent = currentTrack?.id === track.id;
  const liked = isLiked(track.id);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <div
      onClick={() => playTrack(track)}
      className="group relative p-3.5 sm:p-4 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer flex flex-col select-none transition-all duration-300 border border-transparent hover:border-white/5"
    >
      {/* Artwork Thumbnail */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3.5 bg-[#242424] shadow-md group-hover:shadow-xl transition-shadow">
        <img
          src={track.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Floating Spotify Green Play Button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 drop-shadow-xl z-10">
          <button
            onClick={handlePlayClick}
            className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
            title={isCurrent && isPlaying ? "Pause" : "Play"}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5 fill-black text-black" />
            ) : (
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            )}
          </button>
        </div>

        {/* Top-Right Quick Action Badges */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/75 backdrop-blur-md rounded-full px-1.5 py-1 border border-white/10 shadow-lg z-10">
          <button
            onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
            className="p-1 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
            title="Add to Queue"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>
          <DownloadButton track={track} size={14} className="text-[#B3B3B3] hover:text-white" />
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
            className="p-1 rounded-full text-[#B3B3B3] hover:text-[#1ED760] transition-colors"
            title={liked ? "Remove from Liked" : "Save to Liked Songs"}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#1ED760] text-[#1ED760]' : ''}`} />
          </button>
          {onAddToPlaylist && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }}
              className="p-1 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Artist */}
      <div className="overflow-hidden space-y-1 min-h-[44px]">
        <h3
          className={`text-sm font-bold truncate leading-tight transition-colors ${
            isCurrent ? 'text-[#1ED760]' : 'text-white group-hover:text-white'
          }`}
          title={track.title}
        >
          {track.title}
        </h3>
        <p
          className="text-xs text-[#B3B3B3] truncate font-normal leading-tight group-hover:text-white/80 transition-colors"
          title={track.artistName}
        >
          {track.artistName}
        </p>
      </div>
    </div>
  );
}
