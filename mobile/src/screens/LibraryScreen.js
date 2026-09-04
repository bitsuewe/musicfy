import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Switch
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import {
  Heart,
  Clock,
  Download,
  Sparkles,
  HardDrive,
  Play,
  Settings,
  Trash2,
  CheckCircle2,
  Sliders,
  Wifi,
  X
} from 'lucide-react-native';
import {
  getAllDownloadedTracks,
  getOfflineStorageUsage,
  getOfflineSettings,
  updateOfflineSettings,
  clearAutoCachedTracks,
  subscribeToStorageUpdates
} from '../services/offlineStorageService';
import { syncSmartDownloads } from '../services/smartDownloadEngine';
import DownloadButton from '../components/DownloadButton';

export default function LibraryScreen() {
  const { recentlyPlayed, playTrack, playOfflineQueue } = usePlayer();
  const [activeTab, setActiveTab] = useState('offline'); // 'offline' | 'smart' | 'recents'
  const [downloadedData, setDownloadedData] = useState({ manualTracks: [], autoCachedTracks: [], allTracks: [] });
  const [storageUsage, setStorageUsage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    loadOfflineData();
    const unsubscribe = subscribeToStorageUpdates(loadOfflineData);
    return () => unsubscribe();
  }, []);

  const loadOfflineData = async () => {
    try {
      const data = await getAllDownloadedTracks();
      const usage = await getOfflineStorageUsage();
      const s = await getOfflineSettings();
      setDownloadedData(data);
      setStorageUsage(usage);
      setSettings(s);
    } catch (e) {}
  };

  const handleClearAutoCache = () => {
    Alert.alert(
      'Clear Smart Offline Cache?',
      'This will remove all auto-downloaded songs from device storage. Your manually pinned downloads will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearAutoCachedTracks();
            loadOfflineData();
          }
        }
      ]
    );
  };

  const toggleSmartLimit = async (limit) => {
    const updated = await updateOfflineSettings({ smartDownloadLimit: limit });
    setSettings(updated);
    syncSmartDownloads().catch(() => {});
  };

  const getDisplayedTracks = () => {
    if (activeTab === 'offline') {
      return downloadedData.allTracks;
    }
    if (activeTab === 'smart') {
      return downloadedData.autoCachedTracks;
    }
    return recentlyPlayed;
  };

  const displayedTracks = getDisplayedTracks();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Library</Text>
          <Text style={styles.headerSubtitle}>
            {storageUsage ? `${storageUsage.totalCount} Songs Offline • ${storageUsage.formattedTotal}` : 'Offline Collection'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowSettingsModal(true)}
          activeOpacity={0.8}
        >
          <Settings size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Play Banner */}
      {downloadedData.allTracks.length > 0 && (
        <View style={styles.offlineBannerCard}>
          <View style={styles.bannerInfo}>
            <View style={styles.badgeRow}>
              <Sparkles size={12} color="#10B981" />
              <Text style={styles.badgeText}>SMART OFFLINE ACTIVE</Text>
            </View>
            <Text style={styles.bannerTitle}>
              {downloadedData.autoCachedTracks.length > 0
                ? `${downloadedData.autoCachedTracks.length} Smart Auto-Cached Songs`
                : `${downloadedData.manualTracks.length} Pinned Songs Ready`}
            </Text>
            <Text style={styles.bannerSubtitle}>Play anywhere without Wi-Fi or data</Text>
          </View>

          <TouchableOpacity
            style={styles.bannerPlayBtn}
            activeOpacity={0.8}
            onPress={() => playOfflineQueue(activeTab === 'smart')}
          >
            <Play size={18} color="#000000" fill="#000000" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Filter Pills */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'offline' && styles.tabPillActive]}
          onPress={() => setActiveTab('offline')}
        >
          <Download size={14} color={activeTab === 'offline' ? '#10B981' : '#71717A'} />
          <Text style={[styles.tabText, activeTab === 'offline' && styles.tabTextActive]}>
            All Downloads ({downloadedData.allTracks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'smart' && styles.tabPillActive]}
          onPress={() => setActiveTab('smart')}
        >
          <Sparkles size={14} color={activeTab === 'smart' ? '#10B981' : '#71717A'} />
          <Text style={[styles.tabText, activeTab === 'smart' && styles.tabTextActive]}>
            Smart Mix ({downloadedData.autoCachedTracks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'recents' && styles.tabPillActive]}
          onPress={() => setActiveTab('recents')}
        >
          <Clock size={14} color={activeTab === 'recents' ? '#10B981' : '#71717A'} />
          <Text style={[styles.tabText, activeTab === 'recents' && styles.tabTextActive]}>
            Recent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tracks List */}
      {displayedTracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Download size={44} color="#27272A" />
          <Text style={styles.emptyTitle}>
            {activeTab === 'smart' ? 'Smart Downloads Preparing' : 'No Offline Songs Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'smart'
              ? 'Listen to songs and Musicfy will automatically keep your top 50 songs offline!'
              : 'Tap the download icon on any song or album to play offline.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedTracks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.trackRow}
              activeOpacity={0.7}
              onPress={() => playTrack(item, displayedTracks)}
            >
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={styles.artistRow}>
                  {!item.isManual && activeTab !== 'recents' && (
                    <View style={styles.smartTag}>
                      <Text style={styles.smartTagText}>SMART</Text>
                    </View>
                  )}
                  <Text style={styles.artist} numberOfLines={1}>{item.artistName}</Text>
                </View>
              </View>

              {/* Download Action / Status */}
              <DownloadButton track={item} size={18} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Storage & Smart Download Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <HardDrive size={18} color="#10B981" />
                <Text style={styles.modalTitle}>Offline Storage Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X size={20} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            {/* Storage Meter */}
            {storageUsage && (
              <View style={styles.storageMeterBox}>
                <View style={styles.storageLabels}>
                  <Text style={styles.storageTotalText}>Total Storage Used</Text>
                  <Text style={styles.storageNumberText}>{storageUsage.formattedTotal}</Text>
                </View>

                {/* Split breakdown */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownDotPill}>Pinned</Text>
                    <Text style={styles.breakdownVal}>
                      {storageUsage.manualCount} tracks • {storageUsage.formattedManual}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownDotPill, { color: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                      Smart Auto-Cache
                    </Text>
                    <Text style={styles.breakdownVal}>
                      {storageUsage.autoCachedCount} tracks • {storageUsage.formattedAuto}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Smart Auto-Download Toggle */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Smart Auto-Downloads</Text>
                <Text style={styles.settingDesc}>
                  Automatically keeps your most played and liked songs offline.
                </Text>
              </View>
              <Switch
                value={settings?.smartDownloadEnabled ?? true}
                onValueChange={async (val) => {
                  const updated = await updateOfflineSettings({ smartDownloadEnabled: val });
                  setSettings(updated);
                  if (val) syncSmartDownloads().catch(() => {});
                }}
                trackColor={{ false: '#27272A', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Song Count Limit (50 vs 100) */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Smart Offline Limit</Text>
                <Text style={styles.settingDesc}>
                  Target number of auto-saved songs.
                </Text>
              </View>
              <View style={styles.pillGroup}>
                <TouchableOpacity
                  style={[styles.limitPill, settings?.smartDownloadLimit === 50 && styles.limitPillActive]}
                  onPress={() => toggleSmartLimit(50)}
                >
                  <Text style={[styles.limitPillText, settings?.smartDownloadLimit === 50 && styles.limitPillTextActive]}>
                    50 Songs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.limitPill, settings?.smartDownloadLimit === 100 && styles.limitPillActive]}
                  onPress={() => toggleSmartLimit(100)}
                >
                  <Text style={[styles.limitPillText, settings?.smartDownloadLimit === 100 && styles.limitPillTextActive]}>
                    100 Songs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Clear Auto Cache Button */}
            <TouchableOpacity
              style={styles.clearCacheBtn}
              onPress={handleClearAutoCache}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.clearCacheText}>Clear Smart Auto-Cache</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  offlineBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18
  },
  bannerInfo: {
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  badgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800'
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  bannerSubtitle: {
    color: '#A1A1AA',
    fontSize: 11,
    marginTop: 2
  },
  bannerPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  tabPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  tabText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#34D399',
    fontWeight: '700'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14
  },
  emptySubtitle: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6
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
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3
  },
  smartTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  smartTagText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800'
  },
  artist: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#18181C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  storageMeterBox: {
    backgroundColor: '#202024',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  storageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  storageTotalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  storageNumberText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800'
  },
  breakdownRow: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)'
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  breakdownDotPill: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  breakdownVal: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '500'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  settingDesc: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6
  },
  limitPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#27272A'
  },
  limitPillActive: {
    backgroundColor: '#10B981'
  },
  limitPillText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700'
  },
  limitPillTextActive: {
    color: '#000000',
    fontWeight: '800'
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20
  },
  clearCacheText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700'
  }
});
