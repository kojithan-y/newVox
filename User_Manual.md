# User Manual
## Project Name: newVox 

---

### **1. Introduction**
Welcome to **newVox**, a powerful and intuitive voice-to-text transcription application. This guide will walk you through the process of setting up, using, and managing your audio recordings and transcriptions using our web or mobile interfaces.

### **2. Getting Started**
**Accessing the Application:**
* Navigate to the web application URL provided by your administrator, or launch the app on your mobile device.
* The application will immediately request **Microphone Permissions**. You must grant these permissions to allow the app to capture your voice.

### **3. Application Dashboard Overview**
The primary dashboard is designed for quick interactions:
* **Header / Theme Toggle:** Use the "☀️ Light" or "🌙 Dark" button at the top right to switch between display themes based on your preference.
* **Recording Status:** A dynamic status indicator will display your current action (e.g., "Idle", "Recording", "Saving recording", "Stream Live").
* **Voice Recording Type Section:** A selection panel where you must choose the language model for your upcoming recording.

### **4. Choosing a Language (Voice Recording Type)**
Before you start recording, it is crucial to select the correct language pill under "Voice Recording Type":
* **English:** Select this for standard English dictation.
* **Sinhala LK:** Specifically tailored for transcribing Sri Lankan Sinhala.
* **Tamil LK:** Specifically tailored for transcribing Sri Lankan Tamil.
* **Combination (Multilingual):** Uses a robust global model to detect and transcribe combined languages automatically.

### **5. Recording Audio (Standard Mode)**
1. **Start Recording:** Press the large **Start Recording (Microphone icon)** button in the center control card.
2. **Audio Visualizer & Timer:** A timer will appear showing how long you have been speaking, alongside an animated live wave graph representing your audio volume.
3. **Pause/Resume:** Press **Pause** if you need a quick break, and **Resume** to continue.
4. **Stop Recording:** Press the **Stop (Square icon)** button to finish. The app will immediately save the file locally.
5. **Time Limit:** Please note that individual offline/standard recordings are strictly capped at **3 Minutes**. The app will automatically stop recording if this threshold is reached.

### **6. Live Streaming Transcription (Web Only)**
If you are using newVox via a desktop web browser, you can utilize the WebSockets Live Stream for real-time transcription:
1. Ensure your Voice Recording Type is selected.
2. Click the green **🎙️ Start Live Stream** button.
3. Start speaking. Your transcribed text will appear directly in the **Transcript** panel underneath in real-time as you formulate your sentences.
4. Click the red **🛑 Stop Live Stream** button when finished to tear down the connection.

### **7. Managing Transcript Texts**
Once an audio file is uploaded and transcribed, or streamed live, the text will populate the **Transcript** text box.
* **Editing:** You can click into the text box to make manual edits or corrections to the generated text.
* **Copy to Clipboard:** Click **Copy Text** to instantly copy the transcript to your device's clipboard for pasting into other apps.
* **Export Transcript:** Click **Export to .txt** to download your transcription as a standard text document directly to your downloads folder or share cache.

### **8. Saved Recordings List**
Every standard session you record is saved temporarily on your device inside the "Recently Saved Recordings" panel located at the bottom of the screen.
* **Playback:** Click the **Play Audio** button next to any saved item to listen to your voice recording again. A playback visualizer will animate while the audio plays.
* **Transcribe Again:** Clicking the **Transcribe** button will upload that specific saved audio trace to the backend to generate a fresh transcription (useful if you changed the Language Settings!).
* **Delete:** Click the **Delete (Trash bin icon)** button to permanently delete the cached recording and free up device space.

### **9. Troubleshooting & FAQ**
* **"Transcription failed. Check backend URL" error:** This usually indicates your device is not connected to the internet, or the transcription server is currently offline. 
* **"Failed to access microphone":** Please go to your Web Browser or Mobile Device OS settings and explicitly allow newVox access to your microphone hardware.
* **Visualizer isn't animating:** This happens if the microphone input volume is entirely silent. Try speaking a bit louder or closer to the microphone.

---
*End of User Manual.*
