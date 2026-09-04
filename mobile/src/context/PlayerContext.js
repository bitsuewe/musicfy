import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import TrackPlayer, {
  Capability,
  State,
  Event,
  AppKilledPlaybackBehavior
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import {
  getLocalAudioUri,
  getAllDownloadedTracks,
  ensureStorageDirectories
} from '../services/offlineStorageService';
import {
  recordTrackListening,
  recordTrackLikeStatus,
  syncSmartDownloads
} from '../services/smartDownloadEngine';

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

let isTrackPlayerSetup = false;

const setupTrackPlayer = async () => {
  if (isTrackPlayerSetup) return true;
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo
      ]
    });
    isTrackPlayerSetup = true;
    return true;
  } catch (e) {
    console.log('TrackPlayer setup note / fallback to Expo AV:', e);
    return false;
  }
};

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(DEFAULT_TRACK);
  const [queue, setQueue] = useState([DEFAULT_TRACK]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(200);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [likedTrackIds, setLikedTrackIds] = useState(new Set());
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [isNativeReady, setIsNativeReady] = useState(false);

  const soundRef = useRef(null);

  useEffect(() => {
    const initPlayer = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotDuck,
          interruptionModeIOS: InterruptionModeIOS.DoNotDuck,
          playThroughEarpieceAndroid: false
        });
      } catch (e) {}

      const ready = await setupTrackPlayer();
      setIsNativeReady(ready);

      try {
        await ensureStorageDirectories();
        syncSmartDownloads().catch(() => {});
      } catch (e) {}
    };
    initPlayer();
  }, []);

  useEffect(() => {
    if (!isNativeReady) return;

    const subState = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      const stateVal = event.state !== undefined ? event.state : event;
      const playing = stateVal === State.Playing || stateVal === State.Buffering;
      setIsPlaying(playing);
    });

    const subProgress = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
      if (event.position !== undefined) setCurrentTime(Math.floor(event.position));
      if (event.duration !== undefined && event.duration > 0) setDuration(Math.floor(event.duration));
    });

    const subEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      if (currentTrack) recordTrackListening(currentTrack, true);
      playNext();
    });

    return () => {
      subState.remove();
      subProgress.remove();
      subEnded.remove();
    };
  }, [isNativeReady, queue, currentIndex, shuffle, repeatMode, currentTrack]);

  const playTrack = async (track, newQueue = null) => {
    if (!track) return;

    let activeQueue = queue;
    if (newQueue && Array.isArray(newQueue)) {
      setQueue(newQueue);
      activeQueue = newQueue;
      const idx = newQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(track.durationSec || 200);

    setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 20));

    // Resolve offline local file first, then direct server stream, then fallback
    const localUri = await getLocalAudioUri(track.id);
    const baseUrl = api.defaults.baseURL || 'https://musicfy-thjc.onrender.com/api';
    const streamUrl = `${baseUrl}/music/stream/${track.id}`;
    const audioUrl = localUri || track.audioUrl || streamUrl;
    const artwork = track.localArtUri || track.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg';

    // Record listening event for Smart Downloads
    recordTrackListening(track, false);

    if (isNativeReady) {
      try {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: String(track.id),
          url: audioUrl,
          title: track.title || 'Unknown Track',
          artist: track.artistName || 'Musicfy',
          artwork: artwork,
          duration: track.durationSec || 200
        });
        await TrackPlayer.play();
        return;
      } catch (e) {
        console.log('TrackPlayer play error, using fallback:', e);
      }
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, staysActiveInBackground: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
    } catch (e) {}
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.positionMillis) {
        setCurrentTime(Math.floor(status.positionMillis / 1000));
      }
      if (status.durationMillis) {
        setDuration(Math.floor(status.durationMillis / 1000));
      }
      if (status.didJustFinish) {
        if (currentTrack) recordTrackListening(currentTrack, true);
        playNext();
      }
    }
  };

  const togglePlay = async () => {
    if (isNativeReady) {
      try {
        const stateRes = await TrackPlayer.getPlaybackState();
        const currentState = stateRes.state !== undefined ? stateRes.state : stateRes;
        if (currentState === State.Playing) {
          await TrackPlayer.pause();
          setIsPlaying(false);
        } else {
          await TrackPlayer.play();
          setIsPlaying(true);
        }
        return;
      } catch (e) {}
    }

    if (!soundRef.current) {
      playTrack(currentTrack);
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const playNext = () => {
    if (queue.length === 0) return;
    let nextIdx = currentIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    }
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') nextIdx = 0;
      else return;
    }
    setCurrentIndex(nextIdx);
    playTrack(queue[nextIdx]);
  };

  const playPrev = () => {
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = queue.length - 1;
    setCurrentIndex(prevIdx);
    playTrack(queue[prevIdx]);
  };

  const seekTo = async (secs) => {
    setCurrentTime(secs);
    if (isNativeReady) {
      try {
        await TrackPlayer.seekTo(secs);
        return;
      } catch (e) {}
    }
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(secs * 1000);
    }
  };

  const toggleLike = (track) => {
    if (!track?.id) return;
    const isNowLiked = !likedTrackIds.has(track.id);
    setLikedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(track.id)) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
    recordTrackLikeStatus(track, isNowLiked);
  };

  const isLiked = (trackId) => likedTrackIds.has(trackId);

  const playOfflineQueue = async (onlySmart = false) => {
    try {
      const { manualTracks, autoCachedTracks, allTracks } = await getAllDownloadedTracks();
      const list = onlySmart ? autoCachedTracks : allTracks;
      if (list && list.length > 0) {
        playTrack(list[0], list);
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
      shuffle,
      repeatMode,
      isFullscreen,
      likedTrackIds,
      recentlyPlayed,
      setIsFullscreen,
      playTrack,
      togglePlay,
      playNext,
      playPrev,
      seekTo,
      setShuffle: () => setShuffle(!shuffle),
      setRepeatMode: () => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off'),
      toggleLike,
      isLiked,
      playOfflineQueue
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
