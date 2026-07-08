import axios from 'axios';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { env } from '../config/env';

type GoogleAlternative = { transcript?: string };
type GoogleResult = { alternatives?: GoogleAlternative[] };
type GoogleRecognitionResponse = { results?: GoogleResult[] };

const LANGUAGE_CODES = ['ta-LK', 'en-US', 'si-LK', 'ta-IN'];
const execFileAsync = promisify(execFile);

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
  let alternatives: string[] = ['en-US', 'ta-LK', 'ta-IN'];

  if (voiceType === 'si-LK') {
    primaryLanguage = 'si-LK';
    alternatives = [];
  } else if (voiceType === 'ta-LK') {
    primaryLanguage = 'ta-LK';
    alternatives = [];
  } else if (voiceType === 'en-US') {
    primaryLanguage = 'en-US';
    alternatives = [];
  }

  const requestBody = {
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
  };

  try {
    const response = await axios.post<GoogleRecognitionResponse>(env.chirpApiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.chirpApiKey,
      },
      params: {
        // Many Google APIs accept API keys via query param; keep header too as a fallback.
        key: env.chirpApiKey,
      },
      timeout: 60000,
    });

    const transcript = (response.data.results || [])
      .map((result) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    return transcript;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiMessage =
        (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ||
        error.message;
      throw new Error(`Chirp transcription failed: ${apiMessage}`);
    }

    throw error;
  }
};
