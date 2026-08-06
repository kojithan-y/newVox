import speech from '@google-cloud/speech';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { env } from '../config/env';

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
 * Resolves a language code for the given voiceType.
 * Centralised so both batch and streaming stay consistent.
 */
const resolveLanguage = (voiceType: string): string => {
  switch (voiceType) {
    case 'si-LK':
      return 'si-LK';
    case 'ta-IN':
      return 'ta-IN';
    case 'en-US':
      return 'en-US';
    case 'multilingual':
    default:
      return 'en-US';
  }
};

/**
 * Sends uploaded audio to Google Cloud Speech-to-Text (batch / longRunningRecognize).
 * Includes speaker diarization when enabled.
 */
export const transcribeWithChirp = async (
  audioBuffer: Buffer,
  mimeType: string,
  voiceType: string = 'multilingual',
  enableDiarization: boolean = true,
): Promise<string> => {
  const wavBuffer = await toLinear16Wav16kMono(audioBuffer, mimeType);
  const languageCode = resolveLanguage(voiceType);

  // For multilingual batch requests, we can use alternativeLanguageCodes
  const alternatives: string[] = [];
  if (voiceType === 'multilingual') {
    alternatives.push('si-LK', 'ta-IN');
  }

  console.log(`[Batch] Transcribing with language=${languageCode}, model=${env.chirpModel}, diarization=${enableDiarization}`);

  try {
    const config: any = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode,
      alternativeLanguageCodes: alternatives.length > 0 ? alternatives : undefined,
      model: env.chirpModel,
      enableAutomaticPunctuation: true,
      metadata: {
        interactionType: 'DICTATION',
        microphoneDistance: 'NEARFIELD',
        recordingDeviceType: 'SMARTPHONE',
      },
    };

    // Speaker diarization (requested by user toggle)
    if (enableDiarization) {
      config.diarizationConfig = {
        enableSpeakerDiarization: true,
        minSpeakerCount: 1,
        maxSpeakerCount: 6,
      };
    }

    const [operation] = await speechClient.longRunningRecognize({
      config,
      audio: {
        content: wavBuffer.toString('base64'),
      },
    });

    // Wait for the long-running operation to complete.
    const [response] = await operation.promise();

    console.log(`[Batch] Transcription response.results length: ${response.results?.length}`);
    if (response.results && response.results.length > 0) {
      console.log(`[Batch] First result alternative transcript: "${response.results[0].alternatives?.[0]?.transcript}"`);
    }

    if (!response.results || response.results.length === 0) {
      return '';
    }

    // When diarization is enabled, the last result contains the full diarized transcript
    if (enableDiarization) {
      const lastResult = response.results[response.results.length - 1];
      const words = lastResult.alternatives?.[0]?.words || [];

      if (words.length > 0) {
        // Build transcript with speaker labels
        let diarizedText = '';
        let currentSpeaker = -1;

        for (const wordInfo of words) {
          const speaker = wordInfo.speakerTag || 0;
          const word = wordInfo.word || '';

          if (speaker !== currentSpeaker) {
            if (diarizedText.length > 0) diarizedText += '\n';
            diarizedText += `[Speaker ${speaker}]: ${word}`;
            currentSpeaker = speaker;
          } else {
            diarizedText += ` ${word}`;
          }
        }

        return diarizedText.trim();
      }
    }

    // Fallback: plain transcript without diarization
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
 * Note: alternativeLanguageCodes is NOT supported in streaming mode.
 * Note: Diarization in streaming is limited — only en-US with phone_call/default model.
 */
export const createSpeechStream = (
  voiceType: string,
  onData: (data: { transcript: string; isFinal: boolean }) => void,
  onError: (err: any) => void,
) => {
  const languageCode = resolveLanguage(voiceType);

  console.log(`[Stream] Starting speech stream with language=${languageCode}, model=${env.chirpModel}`);

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode,
        // alternativeLanguageCodes NOT supported in streaming
        model: env.chirpModel,
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    })
    .on('error', (err: any) => {
      if (err.code === 11) {
        console.log('[Stream] Stream duration limit reached (~305s). Client should reconnect.');
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
