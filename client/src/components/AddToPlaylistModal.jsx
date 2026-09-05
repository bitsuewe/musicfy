import React, { useState, useEffect } from 'react';
import { X, Plus, Check, FolderPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllPlaylists,
  createNewPlaylist,
  addTrackToSpecificPlaylist,
  removeTrackFromSpecificPlaylist
} from '../services/playlistStorage';

export default function AddToPlaylistModal({ isOpen, track, onClose }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [addedIds, setAddedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const trackId = track?.id || track?._id || track?.trackId || track?.videoId;

  // Whenever modal opens or track changes, load playlists and dynamically compute addedIds
  useEffect(() => {
    if (isOpen && trackId) {
      setLoading(true);
      setShowCreateInput(false);
      setNewPlaylistTitle('');

      fetchAllPlaylists(user)
        .then((list) => {
          setPlaylists(list);
          // Check which playlists already contain this specific track
          const currentTrackId = String(trackId);
          const alreadyAdded = new Set();
          list.forEach((pl) => {
            const hasTrack = (pl.tracks || []).some((item) => {
              const tid = String(item.track?.id || item.id || item.trackId || '');
              return tid === currentTrackId;
            });
            if (hasTrack) {
              alreadyAdded.add(pl.id);
            }
          });
          setAddedIds(alreadyAdded);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setAddedIds(new Set());
      setShowCreateInput(false);
      setNewPlaylistTitle('');
    }
  }, [isOpen, trackId, user]);

  if (!isOpen || !track) return null;

  const handleTogglePlaylist = async (playlistId) => {
    const isCurrentlyAdded = addedIds.has(playlistId);

    if (isCurrentlyAdded) {
      // Remove track from playlist
      try {
        await removeTrackFromSpecificPlaylist(playlistId, trackId, user);
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(playlistId);
          return next;
        });
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId) {
              return {
                ...pl,
                tracks: (pl.tracks || []).filter(
                  (item) => String(item.track?.id || item.id || item.trackId || '') !== String(trackId)
                )
              };
            }
            return pl;
          })
        );
      } catch (err) {
        console.error('Failed to remove track:', err);
      }
    } else {
      // Add track to playlist
      try {
        await addTrackToSpecificPlaylist(playlistId, track, user);
        setAddedIds((prev) => new Set(prev).add(playlistId));
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId) {
              return {
                ...pl,
                tracks: [...(pl.tracks || []), { track }]
              };
            }
            return pl;
          })
        );
      } catch (err) {
        alert('Failed to add track to playlist');
      }
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    try {
      setCreating(true);
      const created = await createNewPlaylist(
        { title: newPlaylistTitle.trim(), description: 'Created with Musicfy' },
        user
      );

      if (created && created.id) {
        // Immediately add track to the newly created playlist
        await addTrackToSpecificPlaylist(created.id, track, user);
        const updatedPlaylist = {
          ...created,
          tracks: [{ track }]
        };

        setPlaylists((prev) => [updatedPlaylist, ...prev]);
        setAddedIds((prev) => new Set(prev).add(created.id));
        setNewPlaylistTitle('');
        setShowCreateInput(false);
      }
    } catch (err) {
      alert('Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#121216] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Add to Playlist</h3>
        <p className="text-xs text-[#A1A1AA] truncate mb-4 font-medium">"{track.title}"</p>

        {/* Create New Playlist Section */}
        <div className="mb-4">
          {!showCreateInput ? (
            <button
              onClick={() => setShowCreateInput(true)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#10B981] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create New Playlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreateAndAdd} className="space-y-2 p-3 rounded-xl bg-white/5 border border-[#10B981]/30">
              <input
                type="text"
                autoFocus
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="Give your playlist a name..."
                className="w-full px-3 py-2 rounded-lg bg-[#18181C] border border-white/15 text-xs text-white focus:outline-none focus:border-[#10B981] transition-colors"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateInput(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newPlaylistTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#34D399] text-black font-extrabold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create & Add</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Existing Playlists List */}
        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
            <p className="text-xs text-[#A1A1AA]">Loading your playlists...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#A1A1AA] space-y-1">
            <p>No playlists yet.</p>
            <p className="text-[11px] text-[#71717A]">Use the button above to create your first playlist!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {playlists.map((pl) => {
              const isAdded = addedIds.has(pl.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => handleTogglePlaylist(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-[#10B981]/15 border-[#10B981]/50 text-white'
                      : 'border-white/10 hover:bg-white/5 text-[#D4D4D8]'
                  }`}
                >
                  <div className="overflow-hidden min-w-0 pr-2">
                    <p className={`text-xs font-bold truncate ${isAdded ? 'text-[#10B981]' : 'text-white'}`}>
                      {pl.title}
                    </p>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                      {pl.tracks?.length || 0} {pl.tracks?.length === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isAdded
                        ? 'bg-[#10B981] text-black shadow-md'
                        : 'bg-white/10 text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    {isAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
