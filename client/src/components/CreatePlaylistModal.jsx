import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createNewPlaylist } from '../services/playlistStorage';

export default function CreatePlaylistModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCollab, setIsCollab] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError('');

    try {
      const created = await createNewPlaylist({
        title: title.trim(),
        description,
        isCollab,
        isPublic: true
      }, user);

      setTitle('');
      setDescription('');
      setIsCollab(false);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-[#27272A] rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create New Playlist</h3>
            <p className="text-xs text-[#A1A1AA]">Curate your universe of music.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Playlist Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Late Night Vibes"
              className="w-full px-4 py-2.5 rounded-xl bg-[#18181C] border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the mood of this playlist..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#18181C] border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181C] border border-[#27272A]">
            <div>
              <p className="text-xs font-semibold text-white">Collaborative Playlist</p>
              <p className="text-[11px] text-[#A1A1AA]">Allow friends to add & reorder songs</p>
            </div>
            <input
              type="checkbox"
              checked={isCollab}
              onChange={(e) => setIsCollab(e.target.checked)}
              className="w-4 h-4 accent-[#10B981] rounded cursor-pointer"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#34D399] text-white font-semibold text-xs shadow-lg hover:opacity-90 transition-opacity"
            >
              {loading ? 'Creating...' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
