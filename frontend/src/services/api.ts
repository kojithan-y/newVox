import axios from 'axios';
import { Platform } from 'react-native';
import { TranscriptionResponse } from '../types';

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4000`;
  }
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:4000' // Android emulator -> host machine loopback
    : 'http://localhost:4000';
};

const apiUrl = getApiUrl();

const client = axios.create({
  baseURL: apiUrl,
  timeout: 45000,
});

export const transcribeAudio = async (audioUri: string, voiceType: string): Promise<TranscriptionResponse> => {
  const formData = new FormData();
  formData.append('voiceType', voiceType);

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      formData.append('audio', blob, 'recording.m4a');
    } catch (e) {
      throw new Error(
        'Failed to fetch the recording audio. If you are trying to transcribe a saved recording from a previous session, browser blob URLs are transient and expire when the page is reloaded. Please record a new audio clip.',
      );
    }
  } else {
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
  }

  try {
    const response = await client.post<TranscriptionResponse>('/api/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message ||
        'Network request failed';
      throw new Error(message);
    }

    throw error;
  }
};
