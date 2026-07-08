import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RecordingItem } from '../types';

interface SavedRecordingsListProps {
  recordings: RecordingItem[];
  formatDuration: (durationMs: number) => string;
  onPlay: (item: RecordingItem) => void;
  onStop: () => void;
  onDelete: (item: RecordingItem) => void;
  onTranscribe: (item: RecordingItem) => void;
  playingItemId: string | null;
  isPlaying: boolean;
  isDark?: boolean;
}

export const SavedRecordingsList = ({
  recordings,
  formatDuration,
  onPlay,
  onStop,
  onDelete,
  onTranscribe,
  playingItemId,
  isPlaying,
  isDark,
}: SavedRecordingsListProps): React.JSX.Element => {
  return (
    <View style={[styles.listCard, isDark && styles.listCardDark]}>
      <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Saved Recordings</Text>
      {recordings.length === 0 ? (
        <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
          No local recordings yet.
        </Text>
      ) : (
        recordings.map((item) => {
          const isCurrentItemPlaying = playingItemId === item.id && isPlaying;
          return (
            <View key={item.id} style={[styles.listItem, isDark && styles.listItemDark]}>
              <View style={styles.listItemLeft}>
                <Text style={[styles.listTitle, isDark && styles.listTitleDark]}>{item.name}</Text>
                <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
                  {new Date(item.createdAt).toLocaleString()} - {formatDuration(item.durationMs)}
                </Text>
              </View>
              <View style={styles.listActions}>
                {isCurrentItemPlaying ? (
                  <Pressable
                    style={[styles.inlineButton, styles.stopButton]}
                    onPress={onStop}
                  >
                    <Text style={styles.stopButtonText}>
                      Stop
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.inlineButton, isDark && styles.inlineButtonDark]}
                    onPress={() => onPlay(item)}
                  >
                    <Text style={[styles.inlineButtonText, isDark && styles.inlineButtonTextDark]}>
                      Play
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.inlineButton, isDark && styles.inlineButtonDark]}
                  onPress={() => onTranscribe(item)}
                >
                  <Text style={[styles.inlineButtonText, isDark && styles.inlineButtonTextDark]}>
                    Transcribe
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.inlineButton, isDark ? styles.deleteButtonDark : styles.deleteButtonLight]}
                  onPress={() => onDelete(item)}
                >
                  <Text style={isDark ? styles.deleteButtonTextDark : styles.deleteButtonTextLight}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    minHeight: 180,
  },
  listCardDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTitleDark: {
    color: '#f8fafc',
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  metaTextDark: {
    color: '#94a3b8',
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  listItemDark: {
    borderBottomColor: '#334155',
  },
  listItemLeft: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  listTitleDark: {
    color: '#f8fafc',
  },
  listActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineButtonDark: {
    backgroundColor: '#334155',
  },
  inlineButtonText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
  inlineButtonTextDark: {
    color: '#cbd5e1',
  },
  stopButton: {
    backgroundColor: '#f59e0b',
  },
  stopButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButtonLight: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonDark: {
    backgroundColor: '#7f1d1d',
  },
  deleteButtonTextLight: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButtonTextDark: {
    color: '#fca5a5',
    fontWeight: '600',
    fontSize: 12,
  },
});
