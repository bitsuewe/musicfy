import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import {
  isTrackDownloaded,
  downloadTrackOffline,
  removeTrackDownload,
  subscribeToStorageUpdates
} from '../services/webOfflineStorage';

export default function DownloadButton({
  track,
  size = 18,
  className = '',
  iconClassName = '',
  onComplete = null
}) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const player = usePlayer();
  const showToast = player?.showToast || console.log;

  const trackId = track?.id || track?._id || track?.trackId || track?.videoId;

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      if (!trackId) return;
      const dl = await isTrackDownloaded(trackId);
      if (mounted) setIsDownloaded(dl);
    };

    checkStatus();
    const unsub = subscribeToStorageUpdates(checkStatus);
    return () => {
      mounted = false;
      unsub();
    };
  }, [trackId]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!trackId) return;

    if (isDownloaded) {
      if (window.confirm(`Remove "${track.title || 'this track'}" from offline downloads?`)) {
        await removeTrackDownload(trackId);
        setIsDownloaded(false);
        showToast(`Removed "${track.title || 'track'}" from offline downloads`);
      }
      return;
    }

    if (isDownloading) return;

    try {
      setIsDownloading(true);
      showToast(`Downloading "${track.title || 'song'}" for offline playback...`);
      const success = await downloadTrackOffline(track, true);
      if (success) {
        setIsDownloaded(true);
        showToast(`Downloaded "${track.title || 'song'}"! Ready offline.`);
        if (onComplete) onComplete();
      } else {
        showToast(`Could not complete download for "${track.title || 'song'}"`);
      }
    } catch (err) {
      console.warn('Download error:', err);
      showToast(`Download failed for "${track.title || 'song'}"`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isDownloading) {
    return (
      <button
        type="button"
        disabled
        className={`p-1.5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center ${className}`}
        title="Downloading for offline listening..."
      >
        <Loader2 className={`animate-spin text-[#10B981] ${iconClassName}`} style={{ width: size, height: size }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-1.5 rounded-full hover:bg-white/10 transition-all active:scale-90 flex items-center justify-center ${className}`}
      title={isDownloaded ? 'Downloaded (Tap to remove)' : 'Download for offline playback'}
    >
      {isDownloaded ? (
        <CheckCircle2
          className={`text-[#10B981] fill-[#10B981]/20 transition-transform ${iconClassName}`}
          style={{ width: size, height: size }}
        />
      ) : (
        <Download
          className={`text-[#8E8E93] hover:text-white transition-colors ${iconClassName}`}
          style={{ width: size, height: size }}
        />
      )}
    </button>
  );
}
