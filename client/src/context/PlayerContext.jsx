import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import api from '../services/api';
import {
  getOfflineAudioUrl,
  getAllDownloadedTracks,
  isTrackDownloaded
} from '../services/webOfflineStorage';
import {
  recordWebTrackListening,
  recordWebTrackLike,
  syncWebSmartDownloads
} from '../services/webSmartDownloadEngine';
import { useAuth } from './AuthContext';

const NativeAudio = registerPlugin('NativeAudioPlugin');

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

const getRecentsKey = (userId) => (userId ? `musicfy_recents_${userId}` : 'musicfy_guest_recents');
const getLikesKey = (userId) => (userId ? `musicfy_likes_${userId}` : 'musicfy_guest_likes');

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

const getSavedRecentTracks = (userId) => {
  try {
    const raw = localStorage.getItem(getRecentsKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

const getSavedLikedTracks = (userId) => {
  try {
    const raw = localStorage.getItem(getLikesKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const PlayerProvider = ({ children }) => {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const savedState = getSavedPlaybackState();
  const savedRecents = getSavedRecentTracks(user?.id);
  const savedLikes = getSavedLikedTracks(user?.id);

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
  const toastTimeoutRef = useRef(null);
  const [showSidePlayer, setShowSidePlayer] = useState(false);
  const [autoPlaySimilar, setAutoPlaySimilar] = useState(true);

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const userInitiatedPauseRef = useRef(false);
  const isChangingTrackRef = useRef(false);
  const activeEngineRef = useRef('youtube'); // 'audio' | 'youtube'
  const isScrubbingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);
  const lastSeekTimeRef = useRef(0);

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

  const audioContextRef = useRef(null);
  const keepAliveOscRef = useRef(null);

  // Web Audio Continuous Background Keeper: Keeps the browser tab marked as Audible and active
  const startKeepAliveAudio = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!keepAliveOscRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // Inaudible (-80dB), prevents background audio suspension
        osc.frequency.value = 40;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        keepAliveOscRef.current = osc;
      }
      if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }

      // Also trigger silent HTML5 audio element
      const anchor = document.getElementById('musicfy-bg-audio-anchor');
      if (anchor) {
        anchor.muted = false;
        anchor.volume = 0.01;
        const p = anchor.play();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  }, []);

  const stopKeepAliveAudio = useCallback(() => {
    try {
      if (keepAliveOscRef.current) {
        try { keepAliveOscRef.current.stop(); } catch (e) {}
        try { keepAliveOscRef.current.disconnect(); } catch (e) {}
        keepAliveOscRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend().catch(() => {});
      }
      const anchor = document.getElementById('musicfy-bg-audio-anchor');
      if (anchor) anchor.pause();
    } catch (e) {}
  }, []);

  const startAudioAnchor = startKeepAliveAudio;
  const stopAudioAnchor = stopKeepAliveAudio;

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

  const pipAnimIntervalRef = useRef(null);
  const pipArtworkImgRef = useRef(null);
  const pipVinylAngleRef = useRef(0);

  // Live Picture-in-Picture Frame Renderer with Rotating Vinyl, Live Album Art & Progress
  const startPipAnimation = useCallback((track) => {
    try {
      const canvas = document.getElementById('musicfy-pip-canvas');
      const video = document.getElementById('musicfy-pip-video');
      if (!canvas || !video || !track) return;

      // Preload current track artwork
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = track.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg';
      pipArtworkImgRef.current = img;

      // Ensure stream is bound to video element with active track
      if (!video.srcObject && canvas.captureStream) {
        try {
          const stream = canvas.captureStream(15);
          video.srcObject = stream;
          video.play().catch(() => {});
        } catch (e) {}
      }

      if (pipAnimIntervalRef.current) {
        clearInterval(pipAnimIntervalRef.current);
      }

      pipAnimIntervalRef.current = setInterval(() => {
        const cv = document.getElementById('musicfy-pip-canvas');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;

        const w = 512;
        const h = 512;

        // 1. Dark Gradient Background
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#09090B');
        bgGrad.addColorStop(1, '#18181C');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Animated Rotating Vinyl Record (behind album art)
        if (isPlayingRef.current) {
          pipVinylAngleRef.current = (pipVinylAngleRef.current + 0.04) % (Math.PI * 2);
        }
        ctx.save();
        ctx.translate(330, 200);
        ctx.rotate(pipVinylAngleRef.current);
        ctx.beginPath();
        ctx.arc(0, 0, 140, 0, Math.PI * 2);
        ctx.fillStyle = '#141418';
        ctx.fill();
        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let r = 120; r > 45; r -= 18) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // Center label
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#09090B';
        ctx.fill();
        ctx.restore();

        // 3. Album Art Card
        const art = pipArtworkImgRef.current;
        if (art && art.complete && art.naturalWidth > 0) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 24;
          ctx.drawImage(art, 32, 60, 260, 260);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 2;
          ctx.strokeRect(32, 60, 260, 260);
        }

        // 4. Live Player Info Banner (Bottom)
        ctx.fillStyle = 'rgba(18, 18, 22, 0.96)';
        ctx.fillRect(0, 360, w, 152);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 360, w, 1);

        // Song Title
        const cur = currentTrackRef.current;
        ctx.fillStyle = '#FAFAFA';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText((cur?.title || 'Musicfy').slice(0, 24), 28, 404);

        // Artist Name
        ctx.fillStyle = '#10B981';
        ctx.font = '600 16px system-ui, -apple-system, sans-serif';
        ctx.fillText((cur?.artistName || 'Artist').slice(0, 30), 28, 434);

        // Dynamic Equalizer Bars
        const colors = ['#10B981', '#34D399', '#6EE7B7', '#10B981'];
        for (let i = 0; i < 4; i++) {
          const barHeight = isPlayingRef.current ? Math.sin(Date.now() / 140 + i * 1.3) * 12 + 16 : 4;
          ctx.fillStyle = colors[i];
          ctx.fillRect(435 + i * 13, 434 - barHeight, 8, barHeight);
        }

        // Live Progress Bar (Bottom 6px)
        const cSec = currentTimeRef.current || 0;
        const dSec = durationRef.current || 200;
        const pct = Math.min(1, Math.max(0, cSec / (dSec || 1)));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 506, w, 6);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(0, 506, w * pct, 6);
      }, 66);
    } catch (e) {}
  }, []);

  const updatePipCanvas = startPipAnimation;

  // Toggle Native Picture-in-Picture Floating Player (Allows cross-app multitasking on iOS/Android)
  const togglePictureInPicture = async () => {
    try {
      const video = document.getElementById('musicfy-pip-video');
      if (!video) return;

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
        startPipAnimation(currentTrackRef.current);
        await video.play().catch(() => {});
        await video.requestPictureInPicture();
        setIsPipActive(true);
        showToast('Floating Player active! Music continues playing across all apps.');
      }
    } catch (e) {
      console.warn('PiP error:', e);
      showToast('Floating Player not supported on this device/browser');
    }
  };

  // Sync Picture-in-Picture open/close state
  useEffect(() => {
    const video = document.getElementById('musicfy-pip-video');
    if (!video) return;
    const onEnter = () => setIsPipActive(true);
    const onLeave = () => {
      setIsPipActive(false);
      if (pipAnimIntervalRef.current) clearInterval(pipAnimIntervalRef.current);
    };
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  // (Consolidated visibilitychange listener is defined alongside page lifecycle events below)

  // Media Session & Native Android Foreground Notification Sync
  const updateMediaSessionMetadata = useCallback((track) => {
    if (Capacitor.isNativePlatform()) {
      try {
        NativeAudio.updateTrackInfo({
          title: track?.title || 'Musicfy',
          artist: track?.artistName || 'Playing Music',
          artwork: track?.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg',
          isPlaying: true
        }).catch(() => {});
      } catch (e) {}
    }

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
    if (Capacitor.isNativePlatform()) {
      try {
        NativeAudio.updateTrackInfo({
          title: currentTrackRef.current?.title || 'Musicfy',
          artist: currentTrackRef.current?.artistName || 'Playing Music',
          artwork: currentTrackRef.current?.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg',
          isPlaying: !!playing
        }).catch(() => {});
      } catch (e) {}
    }

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
      const filtered = (prev || []).filter(t => t && t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(getRecentsKey(userRef.current?.id), JSON.stringify(updated));
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

  // User synchronization: Re-hydrate user-scoped likes and playback history when account changes
  useEffect(() => {
    const activeUserId = user?.id || null;

    // Clear any obsolete shared legacy keys
    try {
      localStorage.removeItem('spicify_user_liked_tracks');
      localStorage.removeItem('spicify_user_recent_tracks');
    } catch (e) {}

    const localLikes = getSavedLikedTracks(activeUserId);
    const localRecents = getSavedRecentTracks(activeUserId);

    setLikedTrackIds(new Set(localLikes.map(t => t.id || t.trackId)));
    setRecentlyPlayed(localRecents);

    if (activeUserId) {
      Promise.allSettled([
        api.get('/likes'),
        api.get('/history')
      ]).then(([likesRes, historyRes]) => {
        if (likesRes.status === 'fulfilled' && Array.isArray(likesRes.value.data?.likes)) {
          const dbLikes = likesRes.value.data.likes.map(l => l.track || l).filter(Boolean);
          if (dbLikes.length > 0) {
            const ids = new Set(dbLikes.map(t => t.id || t.trackId));
            setLikedTrackIds(ids);
            try {
              localStorage.setItem(getLikesKey(activeUserId), JSON.stringify(dbLikes));
            } catch (e) {}
          } else {
            // New user or 0 likes: guarantee clean empty liked state
            setLikedTrackIds(new Set());
            try {
              localStorage.setItem(getLikesKey(activeUserId), JSON.stringify([]));
            } catch (e) {}
          }
        }

        if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data?.history)) {
          const history = historyRes.value.data.history || [];
          if (history.length > 0) {
            const uniqueHistoryTracks = [];
            const seen = new Set();
            history.forEach(h => {
              const tr = h.track || h;
              if (tr && tr.id && !seen.has(tr.id)) {
                seen.add(tr.id);
                uniqueHistoryTracks.push(tr);
              }
            });

            if (uniqueHistoryTracks.length > 0) {
              setRecentlyPlayed(uniqueHistoryTracks);
              try {
                localStorage.setItem(getRecentsKey(activeUserId), JSON.stringify(uniqueHistoryTracks));
              } catch (e) {}
            }
          }
        }
      }).catch(() => {});
    }
  }, [user?.id]);

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
            isChangingTrackRef.current = false;
            userInitiatedPauseRef.current = false;
            setIsPlaying(true);
            startKeepAliveAudio();
            requestWakeLock();
            startPipAnimation(currentTrackRef.current);
            updateMediaSessionPlaybackState(true);
            const d = event.target.getDuration();
            if (d) {
              const durSec = Math.round(d);
              setDuration(durSec);
              updateMediaSessionPosition(currentTimeRef.current, durSec);
            }
            startProgressTimer();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            // Strictly prevent auto-resume when track is transitioning or user initiated pause
            if (!userInitiatedPauseRef.current && isPlayingRef.current && !isChangingTrackRef.current) {
              try {
                if (playerRef.current && playerRef.current.playVideo) {
                  playerRef.current.playVideo();
                }
              } catch (e) {}
            } else if (userInitiatedPauseRef.current) {
              setIsPlaying(false);
              stopKeepAliveAudio();
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

  const pauseTrack = () => {
    userInitiatedPauseRef.current = true;
    const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;
    if (audioEl && !audioEl.paused) audioEl.pause();
    if (playerRef.current && playerRef.current.pauseVideo) {
      try { playerRef.current.pauseVideo(); } catch (e) {}
    }
    setIsPlaying(false);
    stopKeepAliveAudio();
    releaseWakeLock();
    updateMediaSessionPlaybackState(false);
    saveState();
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    progressIntervalRef.current = setInterval(() => {
      if (isScrubbingRef.current) return;
      if (Date.now() - lastSeekTimeRef.current < 1000) return;

      let time = 0;
      const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;

      if (activeEngineRef.current === 'audio' && audioEl) {
        time = Math.round(audioEl.currentTime || 0);
      } else if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          time = Math.round(playerRef.current.getCurrentTime() || 0);
        } catch (e) {}
      }

      if (time !== undefined && !isNaN(time)) {
        setCurrentTime(time);
        currentTimeRef.current = time;

        const now = Date.now();
        if (now - lastSaveTimeRef.current > 4000) {
          lastSaveTimeRef.current = now;
          saveState({ currentTime: time });
          updateMediaSessionPosition(time, durationRef.current);
        }

        // 🔒 Spotify guest preview restriction: non-logged-in users can only play 30 seconds
        if (!userRef.current && time >= 30) {
          pauseTrack();
          showToast('Preview ended (30s) — Sign in to listen to full tracks and download offline.');
        }
      }
    }, 250);
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
      // Replay the current track from 0 with fresh audio engine spin
      playTrack(currentTrackRef.current, null, 0);
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

    // When repeat is 'off' and queue ended, stop cleanly
    setIsPlaying(false);
    stopProgressTimer();
    updateMediaSessionPlaybackState(false);
  };

  const showToast = (msg) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2800);
  };

  const playTrack = (track, newQueue = null, startTime = 0) => {
    if (!track || !track.id) return;

    // Immediately flag track change to suppress any accidental pauses/resumes of previous track
    isChangingTrackRef.current = true;
    userInitiatedPauseRef.current = false;

    // Synchronously stop and unload previous audio immediately to eliminate audio lag and dual playback
    const existingAudio = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;
    if (existingAudio) {
      try {
        existingAudio.pause();
        existingAudio.currentTime = 0;
        existingAudio.removeAttribute('src');
        existingAudio.load();
      } catch (e) {}
    }
    if (playerRef.current && playerRef.current.pauseVideo) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {}
    }

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

    startKeepAliveAudio();
    requestWakeLock();
    startPipAnimation(track);
    updateMediaSessionMetadata(track);
    updateMediaSessionPlaybackState(true);
    updateMediaSessionPosition(startTime, track.durationSec || 200);

    saveRecentTrack(track);

    if (!userRef.current) {
      showToast('Guest preview mode (30s) • Sign in for full tracks');
    }

    if (userRef.current) {
      api.post('/history', {
        trackId: track.id,
        track,
        durationSec: track.durationSec || 200,
        completed: false
      }).catch(() => {});
    }

    saveState({
      currentTrack: track,
      queue: updatedQueue,
      currentIndex: nextIdx,
      currentTime: startTime,
      duration: track.durationSec || 200
    });

    recordWebTrackListening(track, false);

    getOfflineAudioUrl(track.id).then((offlineUrl) => {
      const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;

      if (offlineUrl && audioEl) {
        // High fidelity offline cached track playback
        activeEngineRef.current = 'audio';
        if (playerRef.current && playerRef.current.pauseVideo) {
          try { playerRef.current.pauseVideo(); } catch (e) {}
        }
        audioEl.src = offlineUrl;
        audioEl.currentTime = startTime;
        audioEl.volume = (isMuted ? 0 : volume) / 100;
        audioEl.play().catch(() => {});
        isChangingTrackRef.current = false;

        audioEl.ontimeupdate = () => {
          if (isScrubbingRef.current) return;
          const t = Math.round(audioEl.currentTime);
          setCurrentTime(t);
          currentTimeRef.current = t;
        };

        audioEl.onloadedmetadata = () => {
          if (audioEl.duration && !isNaN(audioEl.duration) && isFinite(audioEl.duration)) {
            const d = Math.round(audioEl.duration);
            setDuration(d);
            updateMediaSessionPosition(startTime, d);
          }
        };

        audioEl.onended = () => {
          recordWebTrackListening(track, true);
          handleTrackEnded();
        };

        audioEl.onplay = () => {
          setIsPlaying(true);
          updateMediaSessionPlaybackState(true);
          startKeepAliveAudio();
        };

        audioEl.onpause = () => {
          if (userInitiatedPauseRef.current) {
            setIsPlaying(false);
            updateMediaSessionPlaybackState(false);
          }
        };
        return;
      }

      // Online playback via YouTube IFrame Audio Engine
      activeEngineRef.current = 'youtube';
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch (e) {}
      }

      if (playerRef.current && playerRef.current.loadVideoById) {
        try {
          playerRef.current.loadVideoById({
            videoId: track.id,
            startSeconds: startTime || 0
          });
          setIsPlaying(true);
          startProgressTimer();

          // Resilient fallback to clear isChangingTrackRef once YouTube iframe buffers
          setTimeout(() => {
            if (isChangingTrackRef.current) {
              isChangingTrackRef.current = false;
              if (isPlayingRef.current && playerRef.current && playerRef.current.playVideo) {
                try { playerRef.current.playVideo(); } catch (e) {}
              }
            }
          }, 1200);
        } catch (err) {
          console.warn('YouTube playback error:', err);
          isChangingTrackRef.current = false;
        }
      } else {
        isChangingTrackRef.current = false;
      }
    });
  };

  const togglePlay = () => {
    const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;
    if (isPlaying) {
      userInitiatedPauseRef.current = true;
      if (activeEngineRef.current === 'audio' && audioEl && !audioEl.paused) {
        audioEl.pause();
      }
      if (playerRef.current && playerRef.current.pauseVideo) {
        try { playerRef.current.pauseVideo(); } catch (e) {}
      }
      setIsPlaying(false);
      stopKeepAliveAudio();
      releaseWakeLock();
      updateMediaSessionPlaybackState(false);
      saveState();
    } else {
      userInitiatedPauseRef.current = false;
      startKeepAliveAudio();
      requestWakeLock();
      startPipAnimation(currentTrackRef.current);
      updateMediaSessionPlaybackState(true);
      setIsPlaying(true);

      if (activeEngineRef.current === 'audio' && audioEl && audioEl.src) {
        audioEl.play().catch(() => {});
      } else if (playerRef.current && playerRef.current.playVideo) {
        try { playerRef.current.playVideo(); } catch (e) {}
      }
      startProgressTimer();
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
    const sec = Math.max(0, Math.min(durationRef.current || 300, Math.round(seconds)));
    lastSeekTimeRef.current = Date.now();
    setCurrentTime(sec);
    currentTimeRef.current = sec;

    const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;

    if (activeEngineRef.current === 'audio' && audioEl && audioEl.src) {
      try {
        audioEl.currentTime = sec;
        if (isPlayingRef.current && audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      } catch (e) {}
    } else if (playerRef.current && playerRef.current.seekTo) {
      try {
        playerRef.current.seekTo(sec, true);
        // Force immediate audio continuation from the seek point without requiring play/pause
        if (isPlayingRef.current) {
          playerRef.current.playVideo();
        }
      } catch (e) {}
    }

    updateMediaSessionPosition(sec, durationRef.current);
    saveState({ currentTime: sec });
  };

  const setVolumeLevel = (val) => {
    setVolume(val);
    saveState({ volume: val });
    const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;
    if (audioEl) audioEl.volume = val / 100;

    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
      if (val === 0) setIsMuted(true);
      else if (isMuted) setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const audioEl = typeof document !== 'undefined' ? document.getElementById('musicfy-offline-audio') : null;
    if (audioEl) audioEl.muted = nextMuted;

    if (!playerRef.current) return;
    if (nextMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
    }
  };

  // Register Native Media Session Action Handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers = [
      ['play', () => {
        userInitiatedPauseRef.current = false;
        const audioEl = document.getElementById('musicfy-offline-audio');
        if (audioEl && audioEl.src) {
          audioEl.play().catch(() => {});
        } else if (playerRef.current && playerRef.current.playVideo) {
          playerRef.current.playVideo();
        }
        setIsPlaying(true);
        startKeepAliveAudio();
        updateMediaSessionPlaybackState(true);
      }],
      ['pause', () => {
        pauseTrack();
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
        pauseTrack();
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

  // Unified Page Visibility & Lifecycle Event Handling (Guarantees zero dual audio playback across tabs/apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background (user switched apps or minimized window)
        if (isPlayingRef.current && !userInitiatedPauseRef.current && !isChangingTrackRef.current) {
          startKeepAliveAudio();
          updateMediaSessionPlaybackState(true);

          if (activeEngineRef.current === 'audio') {
            const audioEl = document.getElementById('musicfy-offline-audio');
            if (audioEl && audioEl.src && audioEl.paused) {
              audioEl.play().catch(() => {});
            }
            if (playerRef.current && playerRef.current.pauseVideo) {
              try { playerRef.current.pauseVideo(); } catch (e) {}
            }
          } else if (activeEngineRef.current === 'youtube') {
            const audioEl = document.getElementById('musicfy-offline-audio');
            if (audioEl && !audioEl.paused) {
              try { audioEl.pause(); } catch (e) {}
            }
            if (playerRef.current && playerRef.current.playVideo) {
              try { playerRef.current.playVideo(); } catch (e) {}
            }
          }
        }
      } else {
        // App returned to foreground
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
        if (activeEngineRef.current === 'youtube' && playerRef.current && playerRef.current.getCurrentTime) {
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
  }, [startKeepAliveAudio, updateMediaSessionPlaybackState, updateMediaSessionPosition]);

  // Global Keyboard Shortcuts (active whenever user is not typing in an input/textarea)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );

      // Focus search bar shortcut: Ctrl+K or '/' key
      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && !isInput) {
        e.preventDefault();
        const searchInput = document.getElementById('musicfy-header-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (isInput) return;

      // Spacebar: Play / Pause toggle
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Next Track: 'N' key OR Ctrl/Alt + ArrowRight
      if (e.key.toLowerCase() === 'n' || ((e.ctrlKey || e.altKey) && e.key === 'ArrowRight')) {
        e.preventDefault();
        playNext();
        return;
      }

      // Previous Track: 'P' key OR Ctrl/Alt + ArrowLeft
      if (e.key.toLowerCase() === 'p' || ((e.ctrlKey || e.altKey) && e.key === 'ArrowLeft')) {
        e.preventDefault();
        playPrev();
        return;
      }

      // Seek Forward 5s: ArrowRight (without modifier) or 'L' key
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        seekTo(currentTimeRef.current + 5);
        return;
      }

      // Seek Backward 5s: ArrowLeft (without modifier) or 'J' key
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        seekTo(currentTimeRef.current - 5);
        return;
      }

      // Mute / Unmute: 'M' key
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
        return;
      }

      // Repeat toggle: 'R' key
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const next = repeatModeRef.current === 'off' ? 'all' : repeatModeRef.current === 'all' ? 'one' : 'off';
        setRepeatMode(next);
        saveState({ repeatMode: next });
        showToast(next === 'all' ? 'Repeat: Entire Queue' : next === 'one' ? 'Repeat: Single Track' : 'Repeat: Off');
        return;
      }

      // Shuffle toggle: 'S' key
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        const next = !shuffleRef.current;
        setShuffle(next);
        saveState({ shuffle: next });
        showToast(next ? 'Shuffle: On' : 'Shuffle: Off');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, playNext, playPrev, seekTo, toggleMute, saveState]);

  // Native Android Media Notification & Lock Screen Action Listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;
    try {
      NativeAudio.addListener('mediaAction', (data) => {
        if (!data || !data.action) return;
        if (data.action === 'play') {
          if (!isPlayingRef.current) togglePlay();
        } else if (data.action === 'pause') {
          if (isPlayingRef.current) togglePlay();
        } else if (data.action === 'next') {
          playNext();
        } else if (data.action === 'prev') {
          playPrev();
        } else if (data.action === 'seek' && typeof data.position === 'number') {
          seekTo(data.position);
        }
      }).then(handle => {
        listenerHandle = handle;
      }).catch(() => {});
    } catch (e) {}

    return () => {
      if (listenerHandle && listenerHandle.remove) {
        listenerHandle.remove();
      }
    };
  }, [togglePlay, playNext, playPrev, seekTo]);

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

  // ❤️ Liked Songs persistence (strictly scoped per user)
  const toggleLike = async (track) => {
    if (!track || !track.id) return;
    const activeUserId = userRef.current?.id || null;

    if (!activeUserId) {
      showToast('Please sign in to save songs to your Liked Songs.');
      return;
    }

    const isCurrentlyLiked = likedTrackIds.has(track.id);
    const updatedLikes = new Set(likedTrackIds);

    let savedList = getSavedLikedTracks(activeUserId);

    if (isCurrentlyLiked) {
      updatedLikes.delete(track.id);
      savedList = savedList.filter(t => (t.id || t.trackId) !== track.id);
      showToast(`Removed "${track.title}" from Liked Songs`);
    } else {
      updatedLikes.add(track.id);
      savedList = [track, ...savedList.filter(t => (t.id || t.trackId) !== track.id)];
      showToast(`Saved "${track.title}" to Liked Songs`);
    }

    setLikedTrackIds(updatedLikes);
    recordWebTrackLike(track, !isCurrentlyLiked);

    try {
      localStorage.setItem(getLikesKey(activeUserId), JSON.stringify(savedList));
    } catch (e) {}

    try {
      await api.post(`/tracks/${track.id}/like`, { track });
    } catch (err) {
      // Offline fallback
    }
  };

  const isLiked = (trackId) => likedTrackIds.has(trackId);

  const playOfflineQueue = async (onlySmart = false) => {
    try {
      const { manualTracks, autoCachedTracks, allTracks } = await getAllDownloadedTracks();
      const list = onlySmart ? autoCachedTracks : allTracks;
      if (list && list.length > 0) {
        playTrack(list[0], list);
      } else {
        showToast('No offline tracks available yet. Tap download on any song!');
      }
    } catch (e) {}
  };

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
      isGuest: !user,
      isPreview: !user,
      pauseTrack,
      showToast,
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
      setIsScrubbing: (val) => { isScrubbingRef.current = Boolean(val); },
      setVolumeLevel,
      toggleMute,
      playOfflineQueue,
      setShuffle: () => {
        const next = !shuffle;
        setShuffle(next);
        saveState({ shuffle: next });
        showToast(next ? 'Shuffle: On' : 'Shuffle: Off');
      },
      setRepeatMode: () => {
        const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
        setRepeatMode(next);
        saveState({ repeatMode: next });
        showToast(next === 'all' ? 'Repeat: Entire Queue' : next === 'one' ? 'Repeat: Single Track' : 'Repeat: Off');
      },
      addToQueue,
      removeFromQueue,
      clearQueue,
      toggleLike,
      isLiked,
      showToast,
      setShowSidePlayer,
      toggleSidePlayer: () => setShowSidePlayer(!showSidePlayer),
      setAutoPlaySimilar: () => setAutoPlaySimilar(!autoPlaySimilar)
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

