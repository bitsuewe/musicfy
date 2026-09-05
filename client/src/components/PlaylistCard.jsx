import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function PlaylistCard({ playlist }) {
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  if (!playlist) return null;

  const trackCount = playlist.tracks?.length || 0;
  const cover = playlist.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0]);
    } else {
      navigate(`/playlist/${playlist.id}`);
    }
  };

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="group relative p-3.5 sm:p-4 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer flex flex-col select-none transition-all duration-300 border border-transparent hover:border-white/5"
    >
      {/* Square Cover */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden mb-3.5 bg-[#242424] shadow-md group-hover:shadow-xl transition-shadow">
        <img
          src={cover}
          alt={playlist.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Floating Green Play Button on Hover */}
        {trackCount > 0 && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 drop-shadow-xl z-10">
            <button
              onClick={handlePlayClick}
              className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
              title="Play Playlist"
            >
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="overflow-hidden space-y-1 min-h-[44px]">
        <h4 className="text-sm font-bold truncate text-white leading-tight group-hover:text-white" title={playlist.title}>
          {playlist.title}
        </h4>
        <p className="text-xs text-[#B3B3B3] line-clamp-2 font-normal leading-tight group-hover:text-white/80 transition-colors">
          {playlist.description || `By ${playlist.owner?.username || 'Musicfy'} • ${trackCount} song${trackCount === 1 ? '' : 's'}`}
        </p>
      </div>
    </div>
  );
}
