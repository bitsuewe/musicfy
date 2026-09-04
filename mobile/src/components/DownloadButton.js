import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, Alert, View } from 'react-native';
import { ArrowDownCircle, CheckCircle2, Download } from 'lucide-react-native';
import {
  isTrackDownloaded,
  downloadTrackOffline,
  removeTrackDownload,
  subscribeToStorageUpdates
} from '../services/offlineStorageService';

export default function DownloadButton({
  track,
  size = 20,
  color = '#71717A',
  activeColor = '#10B981',
  style
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      if (!track?.id) return;
      const isDl = await isTrackDownloaded(track.id);
      if (isMounted) setDownloaded(isDl);
    };

    checkStatus();
    const unsubscribe = subscribeToStorageUpdates(checkStatus);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [track?.id]);

  const handlePress = async () => {
    if (!track || !track.id) return;

    if (downloaded) {
      Alert.alert(
        'Remove Download',
        `Remove "${track.title || 'this track'}" from your offline downloads?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeTrackDownload(track.id);
              setDownloaded(false);
            }
          }
        ]
      );
      return;
    }

    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setProgress(0.1);

      const result = await downloadTrackOffline(track, true, (p) => {
        setProgress(p);
      });

      if (result) {
        setDownloaded(true);
      }
    } catch (err) {
      Alert.alert('Download Error', 'Could not download track for offline listening.');
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  if (isDownloading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={activeColor} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.container, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {downloaded ? (
        <CheckCircle2 size={size} color={activeColor} fill="rgba(16, 185, 129, 0.2)" />
      ) : (
        <Download size={size} color={color} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
