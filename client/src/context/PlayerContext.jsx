import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  const userInitiatedPauseRef = useRef(false);

  // Synchronous references to avoid stale closure in MediaSession and background events
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatModeRef = useRef(repeatMode);
  const shuffleRef = useRef(shuffle);
  const autoPlaySimilarRef = useRef(autoPlaySimilar);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { autoPlaySimilarRef.current = autoPlaySimilar; }, [autoPlaySimilar]);

  // Mobile Background Audio Keep-Alive Anchor (Audio Session keeper)
  const startAudioAnchor = useCallback(() => {
    try {
      const anchor = document.getElementById('musicfy-bg-audio-anchor');
      if (anchor) {
        anchor.muted = false;
        anchor.volume = 0.01; // Inaudible audio level keeping iOS/Android AudioSession active
        const p = anchor.play();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  }, []);

  const stopAudioAnchor = useCallback(() => {
    try {
      const anchor = document.getElementById('musicfy-bg-audio-anchor');
      if (anchor) {
        anchor.pause();
      }
    } catch (e) {}
  }, []);

  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [isPipActive, setIsPipActive] = useState(false);
  const isPipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  const wakeLockRef = useRef(null);

  // Screen Wake Lock API: Prevents mobile screen from turning off or sleeping during music playback
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && keepScreenAwake) {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (e) {}
    }
  }, [keepScreenAwake]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (e) {}
    }
  }, []);

  // Update Picture-in-Picture Canvas Stream
  const updatePipCanvas = useCallback((track) => {
    try {
      const canvas = document.getElementById('musicfy-pip-canvas');
      const video = document.getElementById('musicfy-pip-video');
      if (!canvas || !video || !track) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw background & artwork
        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 46, 30, 420, 420);

        // Dark gradient pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 410, 512, 102);

        // Title and artist
        ctx.fillStyle = '#FAFAFA';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText((track.title || 'Track').slice(0, 28), 24, 450);

        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText((track.artistName || 'Artist').slice(0, 32), 24, 485);

        if (!video.srcObject && canvas.captureStream) {
          video.srcObject = canvas.captureStream(5);
          video.play().catch(() => {});
        }
      };
      img.src = track.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg';
    } catch (e) {}
  }, []);

  // Toggle Native Picture-in-Picture Floating Player (Allows cross-app multitasking on iOS/Android)
  const togglePictureInPicture = async () => {
    try {
      const video = document.getElementById('musicfy-pip-video');
      if (!video) return;

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
        updatePipCanvas(currentTrackRef.current);
        await video.play().catch(() => {});
        await video.requestPictureInPicture();
        setIsPipActive(true);
        showToast('Floating Background Player active! You can now switch to other apps.');
      }
    } catch (e) {
      showToast('Floating Player not supported on this browser');
    }
  };

  // Media Session API Metadata Sync
  const updateMediaSessionMetadata = useCallback((track) => {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      const artworkUrl = track.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg';
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.title || 'Track',
        artist: track.artistName || 'Artist',
        album: track.category || 'Musicfy',
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (e) {}
  }, []);

  const updateMediaSessionPlaybackState = useCallback((playing) => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      } catch (e) {}
    }
  }, []);

  const updateMediaSessionPosition = useCallback((pos, dur) => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        const d = Math.max(1, Number(dur) || 200);
        const p = Math.min(d, Math.max(0, Number(pos) || 0));
        navigator.mediaSession.setPositionState({
          duration: d,
          playbackRate: 1,
          position: p
        });
      } catch (e) {}
    }
  }, []);

  // Helper to persist state to localStorage
  const saveState = useCallback((overrides = {}) => {
    try {
      const data = {
        currentTrack: overrides.currentTrack !== undefined ? overrides.currentTrack : currentTrackRef.current,
        currentTime: overrides.currentTime !== undefined ? overrides.currentTime : currentTimeRef.current,
        duration: overrides.duration !== undefined ? overrides.duration : durationRef.current,
        queue: overrides.queue !== undefined ? overrides.queue : queueRef.current,
        currentIndex: overrides.currentIndex !== undefined ? overrides.currentIndex : currentIndexRef.current,
        volume: overrides.volume !== undefined ? overrides.volume : volume,
        shuffle: overrides.shuffle !== undefined ? overrides.shuffle : shuffleRef.current,
        repeatMode: overrides.repeatMode !== undefined ? overrides.repeatMode : repeatModeRef.current,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }, [volume]);

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
  }, [saveState]);

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
              updateMediaSessionMetadata(latest);
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

  // Update MediaSession metadata when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      updateMediaSessionMetadata(currentTrack);
    }
  }, [currentTrack, updateMediaSessionMetadata]);

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
        playsinline: 1,
        enablejsapi: 1,
        iv_load_policy: 3,
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
            userInitiatedPauseRef.current = false;
            setIsPlaying(true);
            startAudioAnchor();
            requestWakeLock();
            updatePipCanvas(currentTrackRef.current);
            updateMediaSessionPlaybackState(true);
            const d = event.target.getDuration();
            if (d) {
              const durSec = Math.round(d);
              setDuration(durSec);
              updateMediaSessionPosition(currentTimeRef.current, durSec);
            }
            startProgressTimer();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            // Check if pause was an involuntary mobile background suspension
            if (document.hidden && !userInitiatedPauseRef.current) {
              // Attempt automatic background wake-up
              try {
                if (playerRef.current && playerRef.current.playVideo) {
                  playerRef.current.playVideo();
                }
              } catch (e) {}
            } else {
              setIsPlaying(false);
              stopAudioAnchor();
              releaseWakeLock();
              updateMediaSessionPlaybackState(false);
              stopProgressTimer();
              saveState();
            }
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
        try {
          const time = Math.round(playerRef.current.getCurrentTime());
          setCurrentTime(time);
          saveState({ currentTime: time });
          updateMediaSessionPosition(time, durationRef.current);
        } catch (e) {}
      }
    }, 1500);
  };

  const stopProgressTimer = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const handleTrackEnded = async () => {
    const cur = currentTrackRef.current;
    if (cur) {
      api.post('/history', {
        trackId: cur.id,
        track: cur,
        durationSec: durationRef.current,
        completed: true
      }).catch(() => {});
    }

    if (repeatModeRef.current === 'one') {
      seekTo(0);
      playTrack(cur);
      return;
    }

    const q = queueRef.current;
    const curIdx = currentIndexRef.current;
    let nextIdx = curIdx + 1;

    if (shuffleRef.current) {
      nextIdx = Math.floor(Math.random() * q.length);
    }

    if (nextIdx < q.length) {
      setCurrentIndex(nextIdx);
      playTrack(q[nextIdx]);
      return;
    }

    if (repeatModeRef.current === 'all') {
      setCurrentIndex(0);
      playTrack(q[0]);
      return;
    }

    if (autoPlaySimilarRef.current && cur) {
      try {
        const res = await api.get(`/music/search?q=${encodeURIComponent(cur.artistName)}`);
        const newTracks = (res.data.tracks || []).filter(t => t.id !== cur.id && !q.some(item => item.id === t.id));
        
        if (newTracks.length > 0) {
          const nextAutoTrack = newTracks[0];
          const updatedQ = [...q, ...newTracks];
          setQueue(updatedQ);
          setCurrentIndex(q.length);
          playTrack(nextAutoTrack, updatedQ);
          showToast(`Autoplaying next: "${nextAutoTrack.title}"`);
          return;
        }
      } catch (err) {}
    }

    if (q.length > 0) {
      setCurrentIndex(0);
      playTrack(q[0]);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const playTrack = (track, newQueue = null, startTime = 0) => {
    if (!track || !track.id) return;

    userInitiatedPauseRef.current = false;
    let updatedQueue = queueRef.current;
    let nextIdx = currentIndexRef.current;

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      updatedQueue = newQueue;
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      nextIdx = idx >= 0 ? idx : 0;
      setCurrentIndex(nextIdx);
    } else if (!queueRef.current.some(t => t.id === track.id)) {
      updatedQueue = [...queueRef.current, track];
      setQueue(updatedQueue);
      nextIdx = queueRef.current.length;
      setCurrentIndex(nextIdx);
    } else {
      const idx = queueRef.current.findIndex(t => t.id === track.id);
      nextIdx = idx >= 0 ? idx : 0;
      setCurrentIndex(nextIdx);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(startTime);
    setDuration(track.durationSec || 200);

    startAudioAnchor();
    requestWakeLock();
    updatePipCanvas(track);
    updateMediaSessionMetadata(track);
    updateMediaSessionPlaybackState(true);
    updateMediaSessionPosition(startTime, track.durationSec || 200);

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
      userInitiatedPauseRef.current = true;
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      stopAudioAnchor();
      releaseWakeLock();
      updateMediaSessionPlaybackState(false);
      saveState();
    } else {
      userInitiatedPauseRef.current = false;
      playerRef.current.playVideo();
      setIsPlaying(true);
      startAudioAnchor();
      requestWakeLock();
      updatePipCanvas(currentTrackRef.current);
      updateMediaSessionPlaybackState(true);
    }
  };

  const playNext = async () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    let nextIdx = currentIndexRef.current + 1;
    if (shuffleRef.current) {
      nextIdx = Math.floor(Math.random() * q.length);
    }

    if (nextIdx >= q.length) {
      if (repeatModeRef.current === 'all') {
        nextIdx = 0;
      } else if (autoPlaySimilarRef.current && currentTrackRef.current) {
        try {
          const res = await api.get(`/music/search?q=${encodeURIComponent(currentTrackRef.current.artistName)}`);
          const newTracks = (res.data.tracks || []).filter(t => !q.some(item => item.id === t.id));
          if (newTracks.length > 0) {
            const updatedQ = [...q, ...newTracks];
            setQueue(updatedQ);
            nextIdx = q.length;
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

    const nextTrack = q[nextIdx];
    if (nextTrack) {
      setCurrentIndex(nextIdx);
      playTrack(nextTrack);
    }
  };

  const playPrev = () => {
    if (currentTimeRef.current > 3) {
      seekTo(0);
      return;
    }

    const q = queueRef.current;
    let prevIdx = currentIndexRef.current - 1;
    if (prevIdx < 0) prevIdx = q.length - 1;

    const prevTrack = q[prevIdx];
    if (prevTrack) {
      setCurrentIndex(prevIdx);
      playTrack(prevTrack);
    }
  };

  const seekTo = (seconds) => {
    const sec = Math.max(0, Math.min(durationRef.current, Math.round(seconds)));
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(sec, true);
      setCurrentTime(sec);
      saveState({ currentTime: sec });
      updateMediaSessionPosition(sec, durationRef.current);
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

  // Register Native Media Session Action Handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers = [
      ['play', () => {
        userInitiatedPauseRef.current = false;
        if (playerRef.current && playerRef.current.playVideo) {
          playerRef.current.playVideo();
          setIsPlaying(true);
          startAudioAnchor();
          updateMediaSessionPlaybackState(true);
        }
      }],
      ['pause', () => {
        userInitiatedPauseRef.current = true;
        if (playerRef.current && playerRef.current.pauseVideo) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
          stopAudioAnchor();
          updateMediaSessionPlaybackState(false);
        }
      }],
      ['previoustrack', () => playPrev()],
      ['nexttrack', () => playNext()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      }],
      ['seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.max(0, currentTimeRef.current - offset));
      }],
      ['seekforward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.min(durationRef.current, currentTimeRef.current + offset));
      }],
      ['stop', () => {
        userInitiatedPauseRef.current = true;
        if (playerRef.current && playerRef.current.pauseVideo) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
          stopAudioAnchor();
          updateMediaSessionPlaybackState(false);
        }
        seekTo(0);
      }]
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {}
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {}
      });
    };
  }, [startAudioAnchor, updateMediaSessionPlaybackState]);

  // Page Visibility & Lifecycle Event Handling for Background Resiliency
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background (user switched apps or locked phone)
        if (isPlayingRef.current) {
          startAudioAnchor();
          updateMediaSessionPlaybackState(true);
          // If player was playing and was not manually paused, ensure it keeps playing
          if (playerRef.current && playerRef.current.playVideo && !userInitiatedPauseRef.current) {
            try {
              playerRef.current.playVideo();
            } catch (e) {}
          }
        }
      } else {
        // App returned to foreground
        if (playerRef.current && playerRef.current.getCurrentTime) {
          try {
            const time = Math.round(playerRef.current.getCurrentTime());
            setCurrentTime(time);
            if (isPlayingRef.current) {
              updateMediaSessionPosition(time, durationRef.current);
            }
          } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [startAudioAnchor, updateMediaSessionPlaybackState, updateMediaSessionPosition]);

  const addToQueue = (track) => {
    if (!track || !track.id) return;
    const updated = [...queueRef.current, track];
    setQueue(updated);
    saveState({ queue: updated });
    showToast(`Added "${track.title}" to Queue`);
  };

  const removeFromQueue = (indexToRemove) => {
    const updated = queueRef.current.filter((_, i) => i !== indexToRemove);
    setQueue(updated);
    let nextIdx = currentIndexRef.current;
    if (indexToRemove < currentIndexRef.current) {
      nextIdx = currentIndexRef.current - 1;
      setCurrentIndex(nextIdx);
    }
    saveState({ queue: updated, currentIndex: nextIdx });
    showToast('Removed track from Queue');
  };

  const clearQueue = () => {
    if (currentTrackRef.current) {
      const single = [currentTrackRef.current];
      setQueue(single);
      setCurrentIndex(0);
      saveState({ queue: single, currentIndex: 0 });
      showToast('Queue cleared');
    }
  };

  // ❤️ Liked Songs persistence
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
      backgroundPlayEnabled: true,
      keepScreenAwake,
      setKeepScreenAwake,
      toggleKeepScreenAwake: () => setKeepScreenAwake(!keepScreenAwake),
      isPipActive,
      isPipSupported,
      togglePictureInPicture,
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

