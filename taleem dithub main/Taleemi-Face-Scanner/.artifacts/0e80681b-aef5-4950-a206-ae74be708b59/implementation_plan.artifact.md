# Comprehensive App Enhancement Plan

This plan addresses all pending features to make the Taleemi Face Scanner a production-grade biometric system.

## User Review Required

> [!IMPORTANT]
> **Offline Models:** I will run the download script to fetch face-api models to `public/models`. Ensure your internet is active during this step.
> **Voice Feedback:** This uses the browser's `SpeechSynthesis` API. It may sound robotic depending on the device's installed voices.

## Proposed Changes

### [Taleemi Face Scanner App]

#### [MODIFY] [App.jsx](file:///G:/taleem%20dithub/Taleemi-Face-Scanner/src/App.jsx)
- **Offline Models:** Update `MODEL_URL` to point to `/models`.
- **Voice Feedback:** Implement `speak(text)` function using `window.speechSynthesis` for both English and Urdu.
- **Offline Attendance Sync:**
    - Implement a queue in `localStorage` for attendance records when the network is down.
    - Add logic to auto-sync when the app goes online.
- **Enrollment Security:** Add a password check before allowing face registration.
- **History Filtering:** Add a date picker to the attendance log to view specific days.
- **Battery Optimization:** Implement an idle detection to reduce face detection frequency when no movement is detected (via simple frame difference or timeout).

### [Automation & Assets]

#### [RUN] Model Download
- Execute `node download-models.js` to populate `public/models/`.

## Verification Plan

### Automated Tests
- N/A (Manual UI verification required for camera/voice).

### Manual Verification
1. **Offline Test:** Turn off internet and verify models still load.
2. **Attendance Test:** Mark attendance while offline, then turn on internet and verify it syncs to Firebase.
3. **Voice Test:** Scan a face and ensure the app speaks the name.
4. **Security Test:** Try to register a new user and ensure it asks for the school password.
5. **Filter Test:** Check history for yesterday's date.
