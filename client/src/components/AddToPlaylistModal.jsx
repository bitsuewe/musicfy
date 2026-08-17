import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAllPlaylists, addTrackToSpecificPlaylist } from '../services/playlistStorage';

export default function AddToPlaylistModal({ isOpen, track, onClose }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [addedIds, setAddedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchAllPlaylists(user)
        .then(list => setPlaylists(list))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, user]);

  if (!isOpen || !track) return null;

  const handleAddTrack = async (playlistId) => {
    try {
      await addTrackToSpecificPlaylist(playlistId, track, user);
      setAddedIds(prev => new Set(prev).add(playlistId));
    } catch (err) {
      alert('Failed to add track to playlist');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-[#27272A] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-1">Add to Playlist</h3>
        <p className="text-xs text-[#A1A1AA] truncate mb-4">"{track.title}"</p>

        {loading ? (
          <p className="text-xs text-[#A1A1AA] py-4 text-center animate-pulse">Loading playlists...</p>
        ) : playlists.length === 0 ? (
          <p className="text-xs text-[#A1A1AA] py-4 text-center">No playlists created yet. Click "+" in Sidebar to create one.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {playlists.map(pl => {
              const isAdded = addedIds.has(pl.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => !isAdded && handleAddTrack(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border border-[#27272A] cursor-pointer transition-colors ${
                    isAdded ? 'bg-[#10B981]/20 border-[#10B981]/40' : 'hover:bg-[#18181C]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{pl.title}</p>
                    <p className="text-[11px] text-[#A1A1AA]">{pl.tracks?.length || 0} tracks</p>
                  </div>
                  <button className="text-[#34D399]">
                    {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
