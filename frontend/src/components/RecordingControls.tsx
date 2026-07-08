import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isUploading: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isDark?: boolean;
}

export const RecordingControls = ({
  isRecording,
  isPaused,
  isUploading,
  onStart,
  onPause,
  onResume,
  onStop,
  isDark,
}: RecordingControlsProps): React.JSX.Element => {
  return (
    <View style={styles.container}>
      {!isRecording ? (
        <Pressable
          style={[styles.recordButton, isUploading && styles.disabledButton]}
          onPress={onStart}
          disabled={isUploading}
        >
          <View style={[styles.recordOuter, isDark && styles.recordOuterDark]}>
            <View style={styles.recordInner} />
          </View>
          <Text style={styles.buttonLabel}>Start Recording</Text>
        </Pressable>
      ) : (
        <View style={styles.activeRow}>
          <Pressable
            style={[
              styles.actionButton,
              isDark ? styles.pauseButtonDark : styles.pauseButtonLight,
            ]}
            onPress={isPaused ? onResume : onPause}
          >
            <View style={styles.pauseIconRow}>
              {isPaused ? (
                <View style={styles.playIcon} />
              ) : (
                <>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </>
              )}
            </View>
            <Text style={styles.actionText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              isDark ? styles.stopButtonDark : styles.stopButtonLight,
            ]}
            onPress={onStop}
          >
            <View style={styles.stopIcon} />
            <Text
              style={[
                styles.actionText,
                isDark ? styles.stopTextDark : styles.stopTextLight,
              ]}
            >
              Finish & Send
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  recordOuterDark: {
    borderColor: '#451a1a',
    backgroundColor: '#1e293b',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
  },
  recordInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ef4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    minWidth: 140,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  pauseButtonLight: {
    backgroundColor: '#0f172a',
  },
  pauseButtonDark: {
    backgroundColor: '#475569',
  },
  stopButtonLight: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  stopButtonDark: {
    backgroundColor: '#451a1a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  actionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  stopTextLight: {
    color: '#ef4444',
  },
  stopTextDark: {
    color: '#fca5a5',
  },
  pauseIconRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
    height: 14,
  },
  pauseBar: {
    width: 4,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderBottomWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: '#ffffff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
  stopIcon: {
    width: 10,
    height: 10,
    backgroundColor: '#ef4444',
    borderRadius: 2,
  },
});
