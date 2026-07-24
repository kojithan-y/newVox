# Technical Report
## Project Name: newVox Multilingual Voice Transcription System

---

### **1. Introduction**
This document outlines the technical architecture, technology stack, and implementation specifics of the **newVox** application. It servers to detail the underlying infrastructure for continuous development, deployment, and integration of the core real-time streaming services and audio processing logic.

### **2. Technology Stack**
The newVox platform adopts a modular client-server framework to isolate UI interactions from heavy I/O cloud processing.

* **Frontend Client:** React Native (Expo) & React DOM (Web).
* **Backend API & Orchestration:** Node.js, Express.js.
* **Communication Protocols:** HTTP/REST (Static Audio Uploads), WebSockets (Real-time Live Audio Streaming).
* **Cloud Service Provider:** Google Cloud Platform (GCP).
* **AI/ML Transcription Models:** Google Cloud Speech-to-Text API (including explicit Multilingual, en-US, si-LK, and ta-LK configurations).

### **3. System Architecture Overview**
The architecture is divided into three major functioning tiers:

1. **Client Tier (Frontend):** Responsible for audio capture (Microphone interface), local file processing/persisting, visualizing audio bytes array contextually via the Web Audio API, and managing the UI states. 
2. **Server Tier (Backend):** Serves as an intermediary proxy handling payload sanitization, WebSocket buffer management, API routing (`/api/transcribe`, `/api/stream`), and executing `longRunningRecognize` handlers for large media uploads to Google Cloud.
3. **Cloud Tier (Google Cloud Platform):** Encompasses the Speech-to-Text Cloud ML endpoints that ingest serialized `LINEAR16` audio blobs in real-time or via Cloud Storage references for deferred asynchronous processing.

### **4. Component Implementation Details**

#### **4.1 Real-Time Audio Streaming (WebSocket & PCM)**
Live transcription is maintained natively on the web through a robust WebSocket connection. 
* **Audio Interception:** The browser captures raw media streams (`navigator.mediaDevices.getUserMedia`).
* **Processing:** A Web Audio API `ScriptProcessorNode` partitions raw audio vectors and executes a down-sampling algorithm to shift input streams to a standardized 16000Hz (16kHz), 16-bit PCM format `Float32Array -> Int16Array`.
* **Streaming Protocol:** Binary clusters are transmitted seamlessly via `ws://{apiUrl}/api/stream`. The Node.js Express server initializes a `WebSocketServer` bridging raw telemetry streams to Google's `createSpeechStream` (Chirp Service) instance.

#### **4.2 Static Audio Uploads & Limits**
Standard recorded files are capped globally on the client side at exactly 3 minutes (180 seconds) to offset native memory bloat. The Express middleware incorporates `app.use(express.json({ limit: '25mb' }))` to validate and enforce maximum envelope capacities securely.

#### **4.3 Multilingual Recognition Logic**
The backend incorporates a dynamic router resolving specific language targets provided by the frontend configuration state (e.g., Sinhala vs. English):
* The configuration passes a `voiceType` JSON configuration object initially upon socket handshake.
* Depending on the flag, the backend routes requests to GCP's `multilingual` model or a fallback optimized phonetic parser.

#### **4.4 Web Audio API Visualizer Integration**
To represent audio playback and real-time recording intensity:
* The client spawns an `AudioContext` mapped to a 64-bin FFT size `AnalyserNode`.
* It calculates the average frequency output and maps a 0-128 byte range logarithmically to a stabilized 0-100% percentage index, animating the `<AudioVisualizer />` UI component smoothly through `requestAnimationFrame(updateVolume)`.

### **5. Security and Environment Variables**
* **Environment Configuration:** The server mounts isolated configurations via `env.ts` loading explicit Google Application Credentials natively instead of exposing client-side credentials. 
* **CORS & Proxy Mitigation:** Cross-Origin Resource Sharing (`cors`) is structurally enforced via Express middleware allowing cross-device connections without preflight obstructions.

### **6. Error Handling Strategy**
The platform implements explicit boundaries to safeguard cloud quotas and internal state corruptions:
* `notFoundHandler` / `errorHandler` standardizing HTTP 400/500 JSON formatted responses.
* `connection.end()` callbacks inside the WebSocket layer to tear down `speechStream` artifacts instantaneously if a TCP exception or remote disconnection throws.

### **7. Conclusion**
The technical scaffold of the newVox application has been heavily optimized for raw streaming performance prioritizing minimal latency between WebSocket PCM ingestion and GCP Text resolution. The modular interface guarantees rapid adaptability for deploying onto alternative cloud servers or extending explicit translation parameters in the future.
