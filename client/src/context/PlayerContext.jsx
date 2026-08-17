import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const PlayerContext = createContext(null);

const DEFAULT_TRACK = {
  id: "fHI8X4OXluQ",
  title: "Blinding Lights",
  artistName: "The Weeknd",
  thumbnail: "https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg",
  durationSec: 200,
  viewCount: "750M",
  category: "Synthwave"
};

const STORAGE_KEY = 'spicify_playback_state';
const RECENTS_KEY = 'spicify_user_recent_tracks';
const LIKES_KEY = 'spicify_user_liked_tracks';

// Helper to load saved playback state
const getSavedPlaybackState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const getSavedRecentTracks = () => {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

const getSavedLikedTracks = () => {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const PlayerProvider = ({ children }) => {
  const savedState = getSavedPlaybackState();
  const savedRecents = getSavedRecentTracks();
  const savedLikes = getSavedLikedTracks();

  const [currentTrack, setCurrentTrack] = useState(savedState?.currentTrack || DEFAULT_TRACK);
  const [queue, setQueue] = useState(savedState?.queue?.length ? savedState.queue : [savedState?.currentTrack || DEFAULT_TRACK]);
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(savedState?.currentTime || 0);
  const [duration, setDuration] = useState(savedState?.duration || savedState?.currentTrack?.durationSec || 200);
  const [volume, setVolume] = useState(savedState?.volume ?? 80);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(savedState?.shuffle || false);
  const [repeatMode, setRepeatMode] = useState(savedState?.repeatMode || 'off');
  const [playerReady, setPlayerReady] = useState(false);
  const [likedTrackIds, setLikedTrackIds] = useState(new Set(savedLikes.map(t => t.id)));
  const [recentlyPlayed, setRecentlyPlayed] = useState(savedRecents);
  const [toastMessage, setToastMessage] = useState(null);
  const [showSidePlayer, setShowSidePlayer] = useState(false);
  const [autoPlaySimilar, setAutoPlaySimilar] = useState(true);

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const initialSeekDoneRef = useRef(false);

  // Helper to persist state to localStorage
  const saveState = (overrides = {}) => {
    try {
      const data = {
        currentTrack: overrides.currentTrack !== undefined ? overrides.currentTrack : currentTrack,
        currentTime: overrides.currentTime !== undefined ? overrides.currentTime : currentTime,
        duration: overrides.duration !== undefined ? overrides.duration : duration,
        queue: overrides.queue !== undefined ? overrides.queue : queue,
        currentIndex: overrides.currentIndex !== undefined ? overrides.currentIndex : currentIndex,
        volume: overrides.volume !== undefined ? overrides.volume : volume,
        shuffle: overrides.shuffle !== undefined ? overrides.shuffle : shuffle,
        repeatMode: overrides.repeatMode !== undefined ? overrides.repeatMode : repeatMode,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  };

  const saveRecentTrack = (track) => {
    if (!track || !track.id) return;
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Sync on beforeunload
  useEffect(() => {
    const handleUnload = () => {
      saveState();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  });

  // Fetch Initial User Likes & Recent Playback History on login/refresh
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [likesRes, historyRes] = await Promise.allSettled([
        api.get('/likes'),
        api.get('/history')
      ]);

      if (likesRes.status === 'fulfilled') {
        const dbLikes = (likesRes.value.data.likes || []).map(l => l.track).filter(Boolean);
        if (dbLikes.length > 0) {
          const ids = new Set(dbLikes.map(t => t.id));
          setLikedTrackIds(ids);
          try {
            localStorage.setItem(LIKES_KEY, JSON.stringify(dbLikes));
          } catch (e) {}
        }
      }

      if (historyRes.status === 'fulfilled') {
        const history = historyRes.value.data.history || [];
        if (history.length > 0) {
          const uniqueHistoryTracks = [];
          const seen = new Set();
          history.forEach(h => {
            if (h.track && !seen.has(h.track.id)) {
              seen.add(h.track.id);
              uniqueHistoryTracks.push(h.track);
            }
          });

          if (uniqueHistoryTracks.length > 0) {
            setRecentlyPlayed(uniqueHistoryTracks);
            try {
              localStorage.setItem(RECENTS_KEY, JSON.stringify(uniqueHistoryTracks));
            } catch (e) {}

            if (!savedState) {
              const latest = uniqueHistoryTracks[0];
              setCurrentTrack(latest);
              setQueue([latest]);
            }
          }
        }
      }
    } catch (err) {
      // Unauthenticated fallback
    }
  };

  // Load YouTube IFrame Player API
  useEffect(() => {
    const targetVideoId = currentTrack?.id || DEFAULT_TRACK.id;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer(targetVideoId);
      };
    } else {
      initPlayer(targetVideoId);
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const initPlayer = (videoId) => {
    if (playerRef.current) return;

    playerRef.current = new window.YT.Player('musicfy-yt-player-iframe', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        start: Math.floor(currentTime || 0),
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          setPlayerReady(true);
          event.target.setVolume(volume);

          if (currentTime > 0 && !initialSeekDoneRef.current) {
            initialSeekDoneRef.current = true;
            try {
              event.target.seekTo(currentTime, true);
            } catch (e) {}
          }
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            const d = event.target.getDuration();
            if (d) setDuration(Math.round(d));
            startProgressTimer();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            stopProgressTimer();
            saveState();
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            stopProgressTimer();
            handleTrackEnded();
          }
        }
      }
    });
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = Math.round(playerRef.current.getCurrentTime());
        setCurrentTime(time);
        saveState({ currentTime: time });
      }
    }, 1500);
  };

  const stopProgressTimer = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const handleTrackEnded = async () => {
    if (currentTrack) {
      api.post('/history', {
        trackId: currentTrack.id,
        track: currentTrack,
        durationSec: duration,
        completed: true
      }).catch(() => {});
    }

    if (repeatMode === 'one') {
      seekTo(0);
      playTrack(currentTrack);
      return;
    }

    let nextIdx = currentIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    }

    if (nextIdx < queue.length) {
      setCurrentIndex(nextIdx);
      playTrack(queue[nextIdx]);
      return;
    }

    if (repeatMode === 'all') {
      setCurrentIndex(0);
      playTrack(queue[0]);
      return;
    }

    if (autoPlaySimilar && currentTrack) {
      try {
        const res = await api.get(`/music/search?q=${encodeURIComponent(currentTrack.artistName)}`);
        const newTracks = (res.data.tracks || []).filter(t => t.id !== currentTrack.id && !queue.some(q => q.id === t.id));
        
        if (newTracks.length > 0) {
          const nextAutoTrack = newTracks[0];
          const updatedQ = [...queue, ...newTracks];
          setQueue(updatedQ);
          setCurrentIndex(queue.length);
          playTrack(nextAutoTrack, updatedQ);
          showToast(`Autoplaying next: "${nextAutoTrack.title}"`);
          return;
        }
      } catch (err) {}
    }

    if (queue.length > 0) {
      setCurrentIndex(0);
      playTrack(queue[0]);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const playTrack = (track, newQueue = null, startTime = 0) => {
    if (!track || !track.id) return;

    let updatedQueue = queue;
    let nextIdx = currentIndex;

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      updatedQueue = newQueue;
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      nextIdx = idx >= 0 ? idx : 0;
      setCurrentIndex(nextIdx);
    } else if (!queue.some(t => t.id === track.id)) {
      updatedQueue = [...queue, track];
      setQueue(updatedQueue);
      nextIdx = queue.length;
      setCurrentIndex(nextIdx);
    } else {
      const idx = queue.findIndex(t => t.id === track.id);
      nextIdx = idx >= 0 ? idx : 0;
      setCurrentIndex(nextIdx);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(startTime);
    setDuration(track.durationSec || 200);

    saveRecentTrack(track);

    api.post('/history', {
      trackId: track.id,
      track,
      durationSec: track.durationSec || 200,
      completed: false
    }).catch(() => {});

    saveState({
      currentTrack: track,
      queue: updatedQueue,
      currentIndex: nextIdx,
      currentTime: startTime,
      duration: track.durationSec || 200
    });

    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById({
        videoId: track.id,
        startSeconds: startTime
      });
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      saveState();
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const playNext = async () => {
    if (queue.length === 0) return;

    let nextIdx = currentIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    }

    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else if (autoPlaySimilar && currentTrack) {
        try {
          const res = await api.get(`/music/search?q=${encodeURIComponent(currentTrack.artistName)}`);
          const newTracks = (res.data.tracks || []).filter(t => !queue.some(q => q.id === t.id));
          if (newTracks.length > 0) {
            const updatedQ = [...queue, ...newTracks];
            setQueue(updatedQ);
            nextIdx = queue.length;
            playTrack(newTracks[0], updatedQ);
            return;
          } else {
            nextIdx = 0;
          }
        } catch (e) {
          nextIdx = 0;
        }
      } else {
        nextIdx = 0;
      }
    }

    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      setCurrentIndex(nextIdx);
      playTrack(nextTrack);
    }
  };

  const playPrev = () => {
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = queue.length - 1;

    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      setCurrentIndex(prevIdx);
      playTrack(prevTrack);
    }
  };

  const seekTo = (seconds) => {
    const sec = Math.max(0, Math.min(duration, Math.round(seconds)));
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(sec, true);
      setCurrentTime(sec);
      saveState({ currentTime: sec });
    }
  };

  const setVolumeLevel = (val) => {
    setVolume(val);
    saveState({ volume: val });
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
      if (val === 0) setIsMuted(true);
      else if (isMuted) setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const addToQueue = (track) => {
    if (!track || !track.id) return;
    const updated = [...queue, track];
    setQueue(updated);
    saveState({ queue: updated });
    showToast(`Added "${track.title}" to Queue`);
  };

  const removeFromQueue = (indexToRemove) => {
    const updated = queue.filter((_, i) => i !== indexToRemove);
    setQueue(updated);
    let nextIdx = currentIndex;
    if (indexToRemove < currentIndex) {
      nextIdx = currentIndex - 1;
      setCurrentIndex(nextIdx);
    }
    saveState({ queue: updated, currentIndex: nextIdx });
    showToast('Removed track from Queue');
  };

  const clearQueue = () => {
    if (currentTrack) {
      const single = [currentTrack];
      setQueue(single);
      setCurrentIndex(0);
      saveState({ queue: single, currentIndex: 0 });
      showToast('Queue cleared');
    }
  };

  // ❤️ Bulletproof Liked Songs persistence
  const toggleLike = async (track) => {
    if (!track || !track.id) return;

    const isCurrentlyLiked = likedTrackIds.has(track.id);
    const updatedLikes = new Set(likedTrackIds);

    let savedList = getSavedLikedTracks();

    if (isCurrentlyLiked) {
      updatedLikes.delete(track.id);
      savedList = savedList.filter(t => t.id !== track.id);
      showToast(`Removed "${track.title}" from Liked Songs`);
    } else {
      updatedLikes.add(track.id);
      savedList = [track, ...savedList.filter(t => t.id !== track.id)];
      showToast(`Saved "${track.title}" to Liked Songs`);
    }

    setLikedTrackIds(updatedLikes);
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(savedList));
    } catch (e) {}

    try {
      await api.post(`/tracks/${track.id}/like`, { track });
    } catch (err) {
      // Offline fallback
    }
  };

  const isLiked = (trackId) => likedTrackIds.has(trackId);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      queue,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      shuffle,
      repeatMode,
      playerReady,
      recentlyPlayed,
      toastMessage,
      showSidePlayer,
      autoPlaySimilar,
      playTrack,
      togglePlay,
      playNext,
      playPrev,
      seekTo,
      setVolumeLevel,
      toggleMute,
      setShuffle: () => {
        const next = !shuffle;
        setShuffle(next);
        saveState({ shuffle: next });
      },
      setRepeatMode: () => {
        const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
        setRepeatMode(next);
        saveState({ repeatMode: next });
      },
      addToQueue,
      removeFromQueue,
      clearQueue,
      toggleLike,
      isLiked,
      setShowSidePlayer,
      toggleSidePlayer: () => setShowSidePlayer(!showSidePlayer),
      setAutoPlaySimilar: () => setAutoPlaySimilar(!autoPlaySimilar)
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
