import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config();

const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let resolvedGoogleCreds: string | undefined = undefined;

if (googleCreds) {
  resolvedGoogleCreds = path.isAbsolute(googleCreds)
    ? googleCreds
    : path.resolve(process.cwd(), googleCreds);

  if (!fs.existsSync(resolvedGoogleCreds)) {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS file not found at: ${resolvedGoogleCreds}`
    );
  }
  // Export resolved absolute path back to environment variable so Google Cloud libraries automatically consume it
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedGoogleCreds;
}

const hasApiKey = !!process.env.CHIRP_API_KEY;
const hasServiceAccount = !!resolvedGoogleCreds;

if (!hasApiKey && !hasServiceAccount) {
  throw new Error(
    'Missing credentials: standard authentication needs either CHIRP_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env'
  );
}

export const env = {
  port: Number(process.env.PORT || 4000),
  chirpApiKey: process.env.CHIRP_API_KEY,
  chirpApiUrl: process.env.CHIRP_API_URL || 'https://speech.googleapis.com/v1/speech:recognize',
  chirpModel: process.env.CHIRP_MODEL || 'chirp_3',
  googleCredentialsPath: resolvedGoogleCreds,
};

