export interface RecordingItem {
  id: string;
  name: string;
  uri: string;
  createdAt: string;
  durationMs: number;
}

export interface TranscriptionResponse {
  transcript: string;
}
