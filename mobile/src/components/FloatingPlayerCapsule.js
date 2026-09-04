import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Heart } from 'lucide-react-native';

export default function FloatingPlayerCapsule() {
  const { currentTrack, isPlaying, togglePlay, playNext, playPrev, currentTime, duration, setIsFullscreen, isLiked, toggleLike } = usePlayer();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setIsFullscreen(true)}
        style={styles.capsule}
      >
        {/* Track Thumbnail */}
        <Image
          source={{ uri: currentTrack.thumbnail || 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg' }}
          style={styles.thumbnail}
        />

        {/* Track Title & Artist */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artistName}
          </Text>

          {/* Thin Scrubber Line */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Transport Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => toggleLike(currentTrack)} style={styles.iconBtn}>
            <Heart size={18} color={liked ? '#10B981' : '#8E8E93'} fill={liked ? '#10B981' : 'transparent'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={playPrev} style={styles.iconBtn}>
            <SkipBack size={18} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
            {isPlaying ? (
              <Pause size={18} color="#000000" fill="#000000" />
            ) : (
              <Play size={18} color="#000000" fill="#000000" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext} style={styles.iconBtn}>
            <SkipForward size={18} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    right: 12,
    zIndex: 99
  },
  capsule: {
    backgroundColor: '#262629',
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1C1C1E'
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  artist: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden'
  },
  progressBar: {
    height: 2,
    backgroundColor: '#FFFFFF'
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  iconBtn: {
    padding: 6
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
