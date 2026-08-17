import React from 'react';
import { Play, Pause, Heart, Plus, ListPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function TrackCard({ track, onAddToPlaylist }) {
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleLike, isLiked, addToQueue } = usePlayer();

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
      className="group relative p-4 rounded-xl bg-[#181818] hover:bg-[#282828] cursor-pointer spotify-card-hover flex flex-col select-none border border-transparent hover:border-white/5 transition-all duration-300"
    >
      {/* Artwork Thumbnail */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-4 bg-[#282828] shadow-lg">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover"
        />

        {/* Floating Spotify Green Play Button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={handlePlayClick}
            className="w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center spotify-glow hover:scale-105 active:scale-95 transition-transform"
            title="Play"
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5 fill-black text-black" />
            ) : (
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            )}
          </button>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
            className="p-1.5 rounded-full bg-black/60 text-white hover:text-[#1DB954] transition-colors"
            title="Add to Queue"
          >
            <ListPlus className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
            className="p-1.5 rounded-full bg-black/60 text-white hover:text-[#1DB954] transition-colors"
            title="Save to Liked Songs"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-[#1DB954] text-[#1DB954]' : ''}`} />
          </button>
          {onAddToPlaylist && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }}
              className="p-1.5 rounded-full bg-black/60 text-white hover:text-[#1DB954] transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Artist */}
      <div className="overflow-hidden space-y-1">
        <h3 className={`text-sm font-bold truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>
          {track.title}
        </h3>
        <p className="text-xs text-[#B3B3B3] truncate font-medium">
          {track.artistName}
        </p>
      </div>
    </div>
  );
}
