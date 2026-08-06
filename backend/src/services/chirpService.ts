import speech from '@google-cloud/speech';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { env } from '../config/env';

const LANGUAGE_CODES = ['ta-IN', 'en-US', 'si-LK'];
const execFileAsync = promisify(execFile);

// Configure the Google Speech client options
const clientOptions: any = {};
if (env.googleCredentialsPath) {
  clientOptions.keyFilename = env.googleCredentialsPath;
} else if (env.chirpApiKey) {
  clientOptions.apiKey = env.chirpApiKey;
}

const speechClient = new speech.v1p1beta1.SpeechClient(clientOptions);

const toLinear16Wav16kMono = async (input: Buffer, mimeType: string): Promise<Buffer> => {
  if (!ffmpegPath) {
    throw new Error('ffmpeg binary not available (ffmpeg-static not resolved).');
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'newvoxapp-'));
  const inputExt = mimeType.includes('wav') ? 'wav' : mimeType.includes('mpeg') ? 'mp3' : 'm4a';
  const inputPath = path.join(tmpDir, `input.${inputExt}`);
  const outputPath = path.join(tmpDir, 'output.wav');

  try {
    await fs.writeFile(inputPath, input);

    // Convert whatever Expo gives (usually m4a/AAC) into 16kHz mono LINEAR16 WAV,
    // which is broadly accepted by Google STT recognize endpoints.
    await execFileAsync(ffmpegPath, [
      '-y',
      '-i',
      inputPath,
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      'wav',
      outputPath,
    ]);

    return await fs.readFile(outputPath);
  } finally {
    // Best-effort cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

/**
 * Sends uploaded audio to Google Chirp Speech-to-Text.
 * Primary language is English with automatic alternatives for Sinhala and Tamil.
 */
export const transcribeWithChirp = async (
  audioBuffer: Buffer,
  mimeType: string,
  voiceType: string = 'multilingual',
): Promise<string> => {
  const wavBuffer = await toLinear16Wav16kMono(audioBuffer, mimeType);

  let primaryLanguage = 'si-LK';
  let alternatives: string[] = ['en-US', 'ta-IN'];

  if (voiceType === 'si-LK') {
    primaryLanguage = 'si-LK';
    alternatives = [];
  } else if (voiceType === 'ta-IN') {
    primaryLanguage = 'ta-IN';
    alternatives = [];
  } else if (voiceType === 'en-US') {
    primaryLanguage = 'en-US';
    alternatives = [];
  }

  try {
    const [operation] = await speechClient.longRunningRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: primaryLanguage,
        alternativeLanguageCodes: alternatives.length > 0 ? alternatives : undefined,
        model: env.chirpModel,
        enableAutomaticPunctuation: true,
        metadata: {
          interactionType: 'DICTATION',
          microphoneDistance: 'NEARFIELD',
          recordingDeviceType: 'SMARTPHONE',
        },
      },
      audio: {
        content: wavBuffer.toString('base64'),
      },
    });

    // Wait for the long-running operation to complete.
    const [response] = await operation.promise();

    const transcript = (response.results || [])
      .map((result) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    return transcript;
  } catch (error: any) {
    throw new Error(`Chirp transcription failed: ${error.message}`);
  }
};

/**
 * Creates a real-time speech-to-text stream using Google Cloud Speech streamingRecognize.
 */
export const createSpeechStream = (
  voiceType: string,
  onData: (data: { transcript: string; isFinal: boolean }) => void,
  onError: (err: any) => void,
) => {
  let primaryLanguage = 'en-US';

  if (voiceType === 'si-LK') {
    primaryLanguage = 'si-LK';
  } else if (voiceType === 'ta-IN') {
    primaryLanguage = 'ta-IN';
  } else if (voiceType === 'en-US') {
    primaryLanguage = 'en-US';
  } else if (voiceType === 'multilingual') {
    // For multilingual streaming, default to en-US as primary
    // alternativeLanguageCodes is NOT reliably supported in streamingRecognize
    primaryLanguage = 'en-US';
  }

  console.log(`[Stream] Starting speech stream with language: ${primaryLanguage}, model: ${env.chirpModel}`);

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: primaryLanguage,
        // Note: alternativeLanguageCodes removed — not supported in streamingRecognize for most models
        model: env.chirpModel,
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    })
    .on('error', (err: any) => {
      // Error code 11 = STREAM_DURATION_EXCEEDED (normal timeout, not a real error)
      if (err.code === 11) {
        console.log('[Stream] Stream duration limit reached (normal). Client should reconnect.');
      } else {
        console.error(`[Stream] Speech stream error (code ${err.code}):`, err.message);
      }
      onError(err);
    })
    .on('data', (data: any) => {
      const result = data.results?.[0];
      if (result && result.alternatives?.[0]) {
        const transcript = result.alternatives[0].transcript;
        const isFinal = result.isFinal === true;
        onData({ transcript, isFinal });
      }
    });

  return recognizeStream;
};

