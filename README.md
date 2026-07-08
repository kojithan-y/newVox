# NewVoxApp - Cross-Platform Voice-to-Text

A production-ready starter for a cross-platform Voice-to-Text mobile app:

- `frontend/`: React Native (Expo + TypeScript)
- `backend/`: Node.js + Express + TypeScript
- Speech-to-Text provider: Google Chirp API (API key from `.env`)

## Features Implemented

- Microphone recording with **start / pause / resume / stop**
- Local audio file persistence on device (no cloud storage)
- Upload recorded audio to backend for transcription
- Backend transcription endpoint with Chirp API integration
- Multi-language transcription config:
  - English (`en-US`)
  - Sinhala (`si-LK`)
  - Tamil (`ta-IN`)
- Transcript display and manual editing
- Copy transcript to clipboard
- Export transcript as `.txt` file via native share/download flow
- Playback of selected local recording
- List of locally saved recordings
- Loading, status, and network/API error handling

---

## 1) Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- Android Studio and/or Xcode (for emulator/simulator builds)
- Expo CLI (optional if using `npx expo ...`)

---

## 2) Project Structure

```txt
newvoxapp/
  frontend/
  backend/
```

---

## 3) Backend Setup (Express + Chirp)

```bash
cd backend
npm install
```

Create env file:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=4000
CHIRP_API_KEY=your_real_google_chirp_api_key
CHIRP_API_URL=https://speech.googleapis.com/v1/speech:recognize
CHIRP_MODEL=chirp_3
```

Run development server:

```bash
npm run dev
```

Health check:

- `GET http://localhost:4000/health`

Transcription endpoint:

- `POST http://localhost:4000/api/transcribe`
- multipart/form-data field name: `audio`
- response:

```json
{
  "transcript": "your transcribed text"
}
```

---

## 4) Frontend Setup (React Native / Expo)

```bash
cd frontend
npm install
```

Create env file:

```bash
cp .env.example .env
```

Update `frontend/.env` with your backend LAN URL (use your machine IP for physical devices):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

Run app:

```bash
npm run start
```

Then choose:

- `a` for Android emulator
- `i` for iOS simulator (macOS)
- Expo Go on real device (same Wi-Fi network)

---

## 5) Important Notes for Chirp API

- This backend is structured to read the API key from `.env` securely and call Google STT-style endpoint with Chirp model name.
- Depending on your Chirp account/project setup, Google may require:
  - a different endpoint,
  - additional request fields, or
  - OAuth credentials instead of API key.

If your account uses a different Chirp endpoint, only update:

- `CHIRP_API_URL` in `.env`
- request payload mapping inside `backend/src/services/chirpService.ts`

The rest of the app remains unchanged.

---

## 6) Scripts

### Frontend

- `npm run start` - start Expo dev server
- `npm run android` - run on Android
- `npm run ios` - run on iOS

### Backend

- `npm run dev` - start backend in watch mode
- `npm run build` - compile TypeScript to `dist/`
- `npm run start` - run compiled backend

---

## 7) Extend in Future

- Add waveform visualization
- Add delete/rename recording actions
- Add transcript history per recording
- Add background upload queue/retry logic
- Add authentication layer if needed later

---

## 8) Troubleshooting

- Microphone not recording:
  - Ensure microphone permission is granted in app settings.
- Device cannot reach backend:
  - Use PC LAN IP in `EXPO_PUBLIC_API_URL`, not `localhost`, when testing on a phone.
- Empty transcript:
  - Verify audio format support and Chirp API endpoint/credentials.
- Export not working:
  - Check native sharing availability on emulator/device.
