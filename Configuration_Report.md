# Configuration Report
## Project Name: newVox Multilingual Voice Transcription System

---

### **1. Introduction**
This Configuration Report details the necessary environment variables, third-party service setups, and API routing structures required to successfully deploy and maintain the **newVox** application across its development and production builds. 

### **2. Frontend Configuration**
The React / React Native frontend relies on dynamic resolution to communicate with the Node.js backend.

**API Service File:** (`frontend/src/services/api.ts`)
* The frontend dynamically attempts to resolve the backend URI depending on the environment context (Web browser vs. Native App, Development vs. Production).
* In native development setups, the frontend defaults internal endpoints mapping.
* The application utilizes `AsyncStorage` (`@voice_type`) to persist language configuration flags between user sessions.

**Required Permissions (Mobile Builds - `app.json` / `AndroidManifest.xml`):**
* `android.permission.RECORD_AUDIO`: Must be requested and granted dynamically via Expo AV for microphone hardware capture.
* `android.permission.INTERNET`: Required for communicating with backend REST and WebSocket APIs.
* File I/O Permissions for caching local recordings.

### **3. Backend Configuration (Environment Variables)**
The Node server relies heavily on environment configurations to authenticate against Google Cloud safely, isolated within a secure vault or `.env` file loaded via `backend/src/config/env.ts`.

**Expected `.env` variables located in `/backend/.env`:**
```env
# Server Port Mapping
PORT=3000

# Google Cloud Service Account Credentials
# (Critical for authorizing Speech-to-Text V2 or V1 hooks)
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

# (Optional) GCP Project Settings overrides if standard credentials fail
GCP_PROJECT_ID=your-gcp-project-name
GCP_LOCATION=us-central1
```

### **4. Google Cloud Platform (GCP) Configuration**
To configure the Chirp models effectively for `longRunningRecognize` and WebSocket streaming, the GCP project administrating newVox must have the following constraints enabled:

* **Enabled APIs:** Cloud Speech-to-Text API.
* **Service Account Keys:** A `JSON` formatted service account key associated with roles `Cloud Speech Administrator` or `Cloud Speech Client` must be downloaded.
* **Model Constraints:** The `multilingual` model flag triggers a specific endpoint under GCP's newest Universal Speech Models (USM/Chirp) for combination language resolution. Note that Chirp models require explicit regional binding (e.g., `us-central1` or `europe-west4`) compared to the global standard model endpoints.

### **5. WebSocket Streaming Configuration**
The Node.js backend is configured to hijack HTTP server upgrade requests over port `(process.env.PORT || 3000)`.
* **Path:** Connections must strictly bind to `/api/stream`.
* **Binary Serialization:** Clients must serialize payloads into 16-bit PCM arrays (`LINEAR16`). The underlying sample rate configuration injected into Google's `Recognizer` is explicitly fixed at `16000Hz`. Modifying the browser's sampling script requires a synchronized parameter update in the Google API parameters object on the Node backend.

### **6. Upload Limitation Configuration**
* The Node Express server employs `express.json({ limit: '25mb' })` middleware. 
* 25 Megabytes is the maximum tolerated cap for POST requests traversing `/api/transcribe`. This is strictly aligned with the frontend's 3-minute local recording cap, ensuring base64 or multipart audio injections do not crash server memory heaps.

---
*End of Configuration Report.*
