import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import api from '../services/api';
import { Search, Play } from 'lucide-react-native';
import DownloadButton from '../components/DownloadButton';

export default function DiscoverScreen() {
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (text) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await api.get(`/music/search?q=${encodeURIComponent(text)}`);
      setResults(res.data.tracks || []);
    } catch (e) {
      // Offline fallback
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Search</Text>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color="#A1A1AA" />
        <TextInput
          placeholder="Artists, songs, or genres..."
          placeholderTextColor="#71717A"
          value={query}
          onChangeText={handleSearch}
          style={styles.input}
        />
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.trackRow}
            onPress={() => playTrack(item, results)}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{item.artistName}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <DownloadButton track={item} size={18} />
              <Play size={16} color="#10B981" fill="#10B981" />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingHorizontal: 16,
    paddingTop: 48
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#18181C'
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  artist: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  }
});
