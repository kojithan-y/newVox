import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AudioVisualizer } from './src/components/AudioVisualizer';
import { RecordingControls } from './src/components/RecordingControls';
import { SavedRecordingsList } from './src/components/SavedRecordingsList';
import { TranscriptPanel } from './src/components/TranscriptPanel';
import { transcribeAudio } from './src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecordingItem } from './src/types';
import {
  createSafeFileName,
  ensureRecordingsDir,
  getRecordingsDir,
  loadRecordingItems,
  saveRecordingItems,
} from './src/utils/recordingStorage';

const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const App = (): React.JSX.Element => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingItem | null>(null);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState('Idle');
  const soundRef = useRef<Audio.Sound | null>(null);

  // Live visualizer, timer, and theme states
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [voiceType, setVoiceType] = useState<string>('multilingual');

  useEffect(() => {
    const loadVoiceTypeSetting = async () => {
      try {
        const val = await AsyncStorage.getItem('@voice_type');
        if (val) {
          setVoiceType(val);
        }
      } catch (e) {
        // silent fail
      }
    };
    loadVoiceTypeSetting();
  }, []);

  const handleVoiceTypeChange = async (type: string) => {
    setVoiceType(type);
    try {
      await AsyncStorage.setItem('@voice_type', type);
    } catch (e) {
      // silent fail
    }
  };

  // Web Audio Context refs for real-time visualizer mapping
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visualizerStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const startWebAudioMeter = async () => {
    if (Platform.OS !== 'web') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      visualizerStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Map 0-128 range to 0-100 range
        const mappedVolume = Math.min(100, (average / 128) * 100);
        setVolume(mappedVolume);

        animationFrameIdRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn('Failed to initialize Web Audio Analyser', err);
    }
  };

  const stopWebAudioMeter = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    if (visualizerStreamRef.current) {
      visualizerStreamRef.current.getTracks().forEach((track) => track.stop());
      visualizerStreamRef.current = null;
    }
    setVolume(0);
  };

  const currentDuration = useMemo(
    () => (selectedRecording ? formatDuration(selectedRecording.durationMs) : '00:00'),
    [selectedRecording],
  );

  const formattedTimer = useMemo(() => {
    const totalSeconds = Math.floor(recordingDurationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const centiseconds = Math.floor((recordingDurationMs % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${centiseconds}`;
  }, [recordingDurationMs]);

  // Load persisted local recordings on app startup.
  useEffect(() => {
    void (async () => {
      await ensureRecordingsDir();
      const items = await loadRecordingItems();
      setRecordings(items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
      }
      if (Platform.OS === 'web') {
        stopWebAudioMeter();
      }
    };
  }, []);

  const startRecording = async (): Promise<void> => {
    try {
      setErrorMessage(null);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.canRecord && status.isRecording) {
          setRecordingDurationMs(status.durationMillis);

          if (Platform.OS !== 'web' && status.metering !== undefined) {
            const db = status.metering;
            let percent = 0;
            if (db > -160) {
              percent = Math.min(100, Math.max(0, ((db + 160) / 160) * 100));
            }
            setVolume(percent);
          }
        }
      });
      await newRecording.setProgressUpdateInterval(100);

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setStatusText('Recording');

      if (Platform.OS === 'web') {
        void startWebAudioMeter();
      }
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to start recording.');
    }
  };

  const pauseRecording = async (): Promise<void> => {
    if (!recording) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
      setStatusText('Paused');
      setVolume(0);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to pause recording.');
    }
  };

  const resumeRecording = async (): Promise<void> => {
    if (!recording) return;
    try {
      await recording.startAsync();
      setIsPaused(false);
      setStatusText('Recording');
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to resume recording.');
    }
  };

  const stopRecording = async (): Promise<void> => {
    if (!recording) return;

    try {
      setStatusText('Saving recording');
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (Platform.OS === 'web') {
        stopWebAudioMeter();
      }
      setRecordingDurationMs(0);

      setRecording(null);
      setIsRecording(false);
      setIsPaused(false);

      if (!uri) {
        setErrorMessage('Recording URI was not found.');
        return;
      }

      const createdAt = new Date().toISOString();
      const fileName = createSafeFileName(createdAt);
      let outputUri = uri;

      if (Platform.OS !== 'web') {
        const targetUri = `${getRecordingsDir()}${fileName}`;
        // Persist audio in app document storage (local-only).
        await FileSystem.copyAsync({
          from: uri,
          to: targetUri,
        });
        outputUri = targetUri;
      }

      const newItem: RecordingItem = {
        id: `${Date.now()}`,
        name: fileName,
        uri: outputUri,
        createdAt,
        durationMs: status.durationMillis ?? 0,
      };

      const updatedItems = [newItem, ...recordings];
      await saveRecordingItems(updatedItems);
      setRecordings(updatedItems);
      setSelectedRecording(newItem);
      setStatusText('Saved locally');

      await runTranscription(newItem.uri);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to stop recording.');
      setStatusText('Error');
    }
  };

  const runTranscription = async (audioUri: string): Promise<void> => {
    try {
      setIsUploading(true);
      setStatusText('Transcribing');
      const response = await transcribeAudio(audioUri, voiceType);
      setTranscript(response.transcript || '');
      setStatusText('Transcription complete');
    } catch (error) {
      setErrorMessage(
        (error as Error).message ||
        'Transcription failed. Check backend URL or internet connection.',
      );
      setStatusText('Transcription failed');
    } finally {
      setIsUploading(false);
    }
  };

  const copyTranscript = async (): Promise<void> => {
    if (!transcript.trim()) return;
    await Clipboard.setStringAsync(transcript);
    Alert.alert('Copied', 'Transcript copied to clipboard.');
  };

  const exportTranscript = async (): Promise<void> => {
    try {
      if (!transcript.trim()) return;
      const fileName = `transcript-${Date.now()}.txt`;

      if (Platform.OS === 'web') {
        const element = document.createElement('a');
        const file = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setStatusText('Export complete');
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, transcript, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', `Transcript saved to: ${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to export transcript.');
    }
  };

  const playRecording = async (item: RecordingItem): Promise<void> => {
    try {
      setErrorMessage(null);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri: item.uri });
      soundRef.current = sound;
      await sound.playAsync();
      setSelectedRecording(item);
      setStatusText(`Playing ${item.name}`);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to play recording.');
    }
  };

  const transcribeSavedRecording = async (item: RecordingItem): Promise<void> => {
    setSelectedRecording(item);
    await runTranscription(item.uri);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.heading, isDarkMode && styles.headingDark]}>Voice to Text</Text>
          <View style={styles.headerRight}>
            <Pressable
              style={[styles.themeBtn, isDarkMode ? styles.themeBtnDark : styles.themeBtnLight]}
              onPress={() => setIsDarkMode(!isDarkMode)}
            >
              <Text style={[styles.themeBtnText, isDarkMode && styles.themeBtnTextDark]}>
                {isDarkMode ? '☀️ Light' : '🌙 Dark'}
              </Text>
            </Pressable>
            <View style={[styles.badgeContainer, isDarkMode && styles.badgeContainerDark]}>
              <View style={[styles.badgeDot, isRecording && !isPaused && styles.badgeDotActive]} />
              <Text style={[styles.subHeading, isDarkMode && styles.subHeadingDark]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>

        {isRecording && (
          <View style={styles.liveDashboard}>
            <Text style={[styles.timer, isDarkMode && styles.timerDark]}>{formattedTimer}</Text>
            <AudioVisualizer
              isRecording={isRecording}
              isPaused={isPaused}
              volume={volume}
              isDark={isDarkMode}
            />
          </View>
        )}

        <View style={[styles.langCard, isDarkMode && styles.langCardDark]}>
          <Text style={[styles.langLabel, isDarkMode && styles.langLabelDark]}>
            Voice Recording Type
          </Text>
          <View style={styles.langSelectorRow}>
            {[
              { id: 'si-LK', label: 'Sinhala LK' },
              { id: 'ta-LK', label: 'Tamil LK' },
              { id: 'en-US', label: 'English' },
              { id: 'multilingual', label: 'Combination' },
            ].map((option) => {
              const isSelected = voiceType === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[
                    styles.langPill,
                    isDarkMode ? styles.langPillDark : styles.langPillLight,
                    isSelected && (isDarkMode ? styles.langPillSelectedDark : styles.langPillSelectedLight),
                  ]}
                  onPress={() => handleVoiceTypeChange(option.id)}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      isDarkMode ? styles.langPillTextDark : styles.langPillTextLight,
                      isSelected && styles.langPillTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.controlCard, isDarkMode && styles.controlCardDark]}>
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            isUploading={isUploading}
            onStart={startRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={stopRecording}
            isDark={isDarkMode}
          />
        </View>

        {selectedRecording && (
          <View style={[styles.playerCard, isDarkMode && styles.playerCardDark]}>
            <View style={styles.playerInfo}>
              <View style={[styles.audioIcon, isDarkMode && styles.audioIconDark]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]} numberOfLines={1}>
                  {selectedRecording.name}
                </Text>
                <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                  Duration: {currentDuration}
                </Text>
              </View>
            </View>
            <View style={styles.playerActions}>
              <Pressable
                style={[
                  styles.button,
                  isDarkMode ? styles.secondaryButtonDark : styles.secondaryButtonLight,
                ]}
                onPress={() => playRecording(selectedRecording)}
              >
                <Text style={styles.buttonText}>Play Audio</Text>
              </Pressable>
            </View>
          </View>
        )}

        <TranscriptPanel
          transcript={transcript}
          isUploading={isUploading}
          onChangeTranscript={setTranscript}
          onCopy={copyTranscript}
          onExport={exportTranscript}
          isDark={isDarkMode}
        />

        <SavedRecordingsList
          recordings={recordings}
          formatDuration={formatDuration}
          onPlay={playRecording}
          onTranscribe={transcribeSavedRecording}
          isDark={isDarkMode}
        />

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headingDark: {
    color: '#f8fafc',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  themeBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  themeBtnTextDark: {
    color: '#cbd5e1',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  badgeContainerDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  badgeDotActive: {
    backgroundColor: '#ef4444',
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subHeadingDark: {
    color: '#cbd5e1',
  },
  liveDashboard: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerDark: {
    color: '#f8fafc',
  },
  controlCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  controlCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  playerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    gap: 12,
  },
  playerCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  audioIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  audioIconDark: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1d4ed8',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTitleDark: {
    color: '#f8fafc',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  metaTextDark: {
    color: '#94a3b8',
  },
  playerActions: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  secondaryButtonLight: {
    backgroundColor: '#0f172a',
  },
  secondaryButtonDark: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  langCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  langCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  langLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  langLabelDark: {
    color: '#94a3b8',
  },
  langSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  langPillLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  langPillDark: {
    backgroundColor: '#0f172a',
    borderColor: '#475569',
  },
  langPillSelectedLight: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  langPillSelectedDark: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  langPillTextLight: {
    color: '#475569',
  },
  langPillTextDark: {
    color: '#cbd5e1',
  },
  langPillTextSelected: {
    color: '#ffffff',
  },
});

export default App;
