import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Heart, ChevronDown } from 'lucide-react-native';
import DownloadButton from './DownloadButton';

const { width, height } = Dimensions.get('window');

export default function FullscreenPlayerModal() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playNext,
    playPrev,
    currentTime,
    duration,
    shuffle,
    repeatMode,
    setShuffle,
    setRepeatMode,
    isFullscreen,
    setIsFullscreen,
    isLiked,
    toggleLike
  } = usePlayer();

  if (!currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <Modal
      visible={isFullscreen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsFullscreen(false)}
    >
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setIsFullscreen(false)} style={styles.chevronBtn}>
            <ChevronDown size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PLAYING FROM DISCOVER</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Large Artwork */}
        <View style={styles.artContainer}>
          <Image
            source={{ uri: currentTrack.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg' }}
            style={styles.artwork}
          />
        </View>

        {/* Track Title, Artist, Download & Like */}
        <View style={styles.metaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artistName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <DownloadButton track={currentTrack} size={24} />
            <TouchableOpacity onPress={() => toggleLike(currentTrack)} style={styles.likeBtn}>
              <Heart size={24} color={liked ? '#10B981' : '#FFFFFF'} fill={liked ? '#10B981' : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrubber Bar */}
        <View style={styles.scrubberContainer}>
          <View style={styles.scrubberTrack}>
            <View style={[styles.scrubberProgress, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>-{formatTime(Math.max(0, duration - currentTime))}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={setShuffle}>
            <Shuffle size={22} color={shuffle ? '#10B981' : '#8E8E93'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={playPrev}>
            <SkipBack size={32} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.largePlayBtn}>
            {isPlaying ? (
              <Pause size={30} color="#000000" fill="#000000" />
            ) : (
              <Play size={30} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext}>
            <SkipForward size={32} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={setRepeatMode}>
            <Repeat size={22} color={repeatMode !== 'off' ? '#10B981' : '#8E8E93'} />
          </TouchableOpacity>
        </View>

        {/* Lossless Atmos Badge */}
        <View style={styles.bottomTag}>
          <Text style={styles.bottomTagText}>Lossless • Native Background Audio Active</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
    justifyContent: 'space-between'
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chevronBtn: {
    padding: 4
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1
  },
  artContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  artwork: {
    width: width - 64,
    height: width - 64,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 30
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800'
  },
  artist: {
    color: '#A1A1AA',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4
  },
  likeBtn: {
    padding: 8
  },
  scrubberContainer: {
    marginBottom: 20
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  scrubberProgress: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  timeText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600'
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10
  },
  largePlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12
  },
  bottomTag: {
    alignItems: 'center'
  },
  bottomTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700'
  }
});
