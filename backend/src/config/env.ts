import dotenv from 'dotenv';

dotenv.config();

const required = ['CHIRP_API_KEY'] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  chirpApiKey: process.env.CHIRP_API_KEY as string,
  chirpApiUrl: process.env.CHIRP_API_URL || 'https://speech.googleapis.com/v1/speech:recognize',
  chirpModel: process.env.CHIRP_MODEL || 'chirp_3',
};
