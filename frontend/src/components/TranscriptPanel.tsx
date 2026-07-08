import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface TranscriptPanelProps {
  transcript: string;
  isUploading: boolean;
  onChangeTranscript: (value: string) => void;
  onCopy: () => void;
  onExport: () => void;
  isDark?: boolean;
}

export const TranscriptPanel = ({
  transcript,
  isUploading,
  onChangeTranscript,
  onCopy,
  onExport,
  isDark,
}: TranscriptPanelProps): React.JSX.Element => {
  return (
    <View style={[styles.transcriptCard, isDark && styles.transcriptCardDark]}>
      <View style={styles.transcriptHeader}>
        <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Transcript</Text>
        {isUploading ? <ActivityIndicator size="small" color="#3b82f6" /> : null}
      </View>
      <TextInput
        style={[
          styles.transcriptInput,
          isDark ? styles.transcriptInputDark : styles.transcriptInputLight,
        ]}
        multiline
        value={transcript}
        onChangeText={onChangeTranscript}
        placeholder="Transcript will appear here..."
        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
      />
      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.button,
            isDark ? styles.secondaryButtonDark : styles.secondaryButtonLight,
          ]}
          onPress={onCopy}
        >
          <Text style={styles.buttonText}>Copy</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.primaryButton]} onPress={onExport}>
          <Text style={styles.buttonText}>Download .txt</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  transcriptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  transcriptCardDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTitleDark: {
    color: '#f8fafc',
  },
  transcriptInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
  },
  transcriptInputLight: {
    borderColor: '#cbd5e1',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  transcriptInputDark: {
    borderColor: '#475569',
    color: '#f8fafc',
    backgroundColor: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButtonLight: {
    backgroundColor: '#334155',
  },
  secondaryButtonDark: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
