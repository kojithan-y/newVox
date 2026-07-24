# Business Requirements Document (BRD)
## Project Name: newVox Multilingual Voice Transcription System

---

### **1. Executive Summary**
The **newVox** project is a cross-platform (Web and Mobile) voice transcription application aimed at providing users with high-accuracy, real-time audio transcription capabilities. Driven by the need for multilingual support and accessibility in diverse environments, the system leverages Google Cloud Speech-to-Text capabilities to transcribe speech in English, Sinhala, Tamil, and a dynamic Multilingual/Combination mode. The primary goal is to create an intuitive application that facilitates live audio transcription, playback visualization, and management of saved recordings.

### **2. Project Description**
newVox is designed with a React/React Native frontend and a Node.js (Express) backend. It provides users with a clean, dual-themed (Dark/Light mode) dashboard to record, transcribe, playback, and export audio sessions. Real-time transcription is achieved via WebSockets, ensuring minimal latency between audio capture and text generation. It incorporates interactive visualizers for audio frequency monitoring (using Web Audio API metrics). 

### **3. Project Scope**
**In-Scope:**
* **Real-time Live Streaming:** Transcribing live audio chunks instantly through WebSockets.
* **Recording Capabilities:** Capturing audio locally with visual volume mapping and saving it sequentially.
* **Multilingual Transcription:** Supporting explicit language models (`en-US`, `si-LK`, `ta-LK`) alongside a combination model (`multilingual`).
* **Playback and Visualizer:** Allowing users to listen to their past recordings with an animated frequency visualizer.
* **Transcript Management:** Features to copy transcribed text to clipboard or export directly as a `.txt` file.
* **Local Persistence:** Saving recording metadata locally using an embedded storage utility.

**Out-of-Scope:**
* Integrated third-party cloud syncing (e.g., Google Drive / Dropbox integration).
* Enterprise user authentication and access-control roles.
* Translating text from one recorded language to another.

### **4. Business Drivers**
* **Inclusivity & Accessibility:** Addressing transcription needs for regional languages (Sinhala & Tamil) that are often underserved by primary transcription utilities.
* **Productivity Enhancement:** Providing an integrated workflow where users can capture meetings, notes, and interviews natively and retrieve transcripts quickly.
* **Scalability:** By shifting compute-heavy long-running transcription processes to Google Cloud Platform (GCP) and adopting a WebSocket-driven system architecture, the platform sets a scalable foundation for concurrent users.

### **5. Current Process vs. Proposed Process**
* **Current Process:** Users rely on single-language external transcription tools, often experiencing degraded service latency due to HTTP polling limits or lack of support for native Sri Lankan languages.
* **Proposed Process (newVox):** Users open the newVox seamless interface, select the specific phonetic target or "multilingual" mode, and begin speaking. Audio buffers are transmitted synchronously via WebSockets yielding live transcript updates. Users also have the ability to record offline, save audio limits up to predefined length caps (3 minutes), and transcribe stored files asynchronously.

### **6. Functional Requirements**
**FR-1: Audio Recording Engine**
* The system must allow users to initiate, pause, resume, and stop audio recordings.
* The system must strictly cap consecutive audio recordings at 180 seconds (3 minutes) to bypass browser-memory overflow traps.
* The system must feature a real-time decibel meter that reflects audio input volume visually.

**FR-2: Cloud Transcription Services (GCP Integration)**
* The application must support WebSocket integration (`/api/stream`) for receiving and dispatching binary `LINEAR16` audio chunks to GCP services.
* The system must return transcription strings indicating real-time confidence scores and "finalized" statements (`isFinal: true`).

**FR-3: User Interface & Experience Settings**
* The application must offer native toggle switching between Dark Mode and Light Mode, preserving states contextually.
* The application must persist the user's preferred "Voice Recording Type" locally using application storage elements (e.g., AsyncStorage).

**FR-4: Transcript Exports & Interaction**
* Transcribed texts must be rendered dynamically inside a review panel.
* The system must allow one-click clipboard copying and generating downloadable text files.

**FR-5: Archiving and Playback**
* The application must allocate a local cache to preserve previously recorded `.wav` or `.m4a` files.
* Users must be able to delete historical recordings manually.
* The system must synthesize dynamic visualizers simulating audio waves playback upon listening to historical recordings.

### **7. Non-Functional Requirements (NFRs)**
* **Performance:** Live WebSocket transcription latency must be under a 2-second turnaround for continuous speech flow.
* **Maintainability:** The system will employ strict error handlers (`notFoundHandler`, `errorHandler`) globally on the Node.js server to prevent unforeseen backend crashes during audio serialization.
* **Cross-Platform Compatibility:** The React client must respond smoothly across modern web browsers, maintaining feature parity except for native hardware locks.
* **Security & Payload Restrictions:** Upload APIs must restrict JSON/audio multipart payloads to 25MB (`app.use(express.json({ limit: '25mb' }))`).
* **Hardware Resilience:** The application must cleanly terminate socket operations, audio hooks, and Web Audio context streams upon un-mount to prevent memory leaks.

### **8. Glossary**
* **GCP:** Google Cloud Platform (Host for specialized speech models: Chirp).
* **ASR:** Automatic Speech Recognition.
* **WebSockets:** A computer communications protocol, providing full-duplex communication channels over a single TCP connection.
* **PCM/LINEAR16:** Pulse-code modulation audio format enforced by speech-to-text models for optimal uncompressed accuracy.
