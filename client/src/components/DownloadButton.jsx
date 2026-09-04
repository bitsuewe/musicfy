import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      if (!track?.id) return;
      const dl = await isTrackDownloaded(track.id);
      if (mounted) setIsDownloaded(dl);
    };

    checkStatus();
    const unsub = subscribeToStorageUpdates(checkStatus);
    return () => {
      mounted = false;
      unsub();
    };
  }, [track?.id]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!track?.id) return;

    if (isDownloaded) {
      if (window.confirm(`Remove "${track.title || 'this track'}" from offline downloads?`)) {
        await removeTrackDownload(track.id);
        setIsDownloaded(false);
      }
      return;
    }

    if (isDownloading) return;

    try {
      setIsDownloading(true);
      const success = await downloadTrackOffline(track, true);
      if (success) {
        setIsDownloaded(true);
        if (onComplete) onComplete();
      }
    } catch (err) {
      console.warn('Download error:', err);
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
