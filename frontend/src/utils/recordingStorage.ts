import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { RecordingItem } from '../types';

const STORAGE_KEY = 'newvoxapp_recordings';
const RECORDINGS_DIR =
  Platform.OS === 'web' ? '' : `${FileSystem.documentDirectory ?? ''}recordings/`;

export const ensureRecordingsDir = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
};

export const getRecordingsDir = (): string => RECORDINGS_DIR;

export const loadRecordingItems = async (): Promise<RecordingItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as RecordingItem[];
    return parsed;
  } catch {
    return [];
  }
};

export const saveRecordingItems = async (items: RecordingItem[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const createSafeFileName = (isoDate: string): string => {
  return `recording-${isoDate.replace(/[:.]/g, '-')}.m4a`;
};
