import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Sparkles, Play, Flame } from 'lucide-react-native';
import DownloadButton from '../components/DownloadButton';

export default function HomeScreen() {
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const res = await api.get('/music/trending');
      setTrending(res.data.tracks || []);
    } catch (e) {
      // Fallback curated tracks
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good afternoon,</Text>
          <Text style={styles.userName}>{user ? user.username : 'Musicfy Listener'}</Text>
        </View>
        <View style={styles.pill}>
          <Sparkles size={14} color="#10B981" />
          <Text style={styles.pillText}>Dolby Atmos</Text>
        </View>
      </View>

      {/* Featured Banner */}
      {trending.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => playTrack(trending[0], trending)}
          style={styles.heroCard}
        >
          <Image source={{ uri: trending[0].thumbnail }} style={styles.heroImg} />
          <View style={styles.heroOverlay}>
            <View style={styles.heroBadge}>
              <Flame size={12} color="#10B981" />
              <Text style={styles.heroBadgeText}>TOP GLOBAL HIT</Text>
            </View>
            <Text style={styles.heroTitle}>{trending[0].title}</Text>
            <Text style={styles.heroArtist}>{trending[0].artistName}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Trending Now Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Worldwide</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={trending}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => playTrack(item, trending)}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.cardImg} />
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardArtist} numberOfLines={1}>{item.artistName}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Quick Play List */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Featured Tracks</Text>
      </View>

      {trending.slice(0, 6).map((track, i) => (
        <TouchableOpacity
          key={`${track.id}-${i}`}
          style={styles.trackRow}
          onPress={() => playTrack(track, trending)}
        >
          <Image source={{ uri: track.thumbnail }} style={styles.rowImg} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.rowArtist} numberOfLines={1}>{track.artistName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <DownloadButton track={track} size={18} />
            <View style={styles.playIconCircle}>
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* Bottom Spacer for floating player */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B'
  },
  content: {
    padding: 16,
    paddingTop: 48
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  greeting: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600'
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  pillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700'
  },
  heroCard: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#18181C'
  },
  heroImg: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    justifyContent: 'flex-end'
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6
  },
  heroBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800'
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800'
  },
  heroArtist: {
    color: '#D4D4D8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2
  },
  sectionHeader: {
    marginBottom: 12
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  card: {
    width: 140,
    marginRight: 12
  },
  cardImg: {
    width: 140,
    height: 140,
    borderRadius: 14,
    backgroundColor: '#18181C'
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8
  },
  cardArtist: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  rowImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#18181C'
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  rowArtist: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
