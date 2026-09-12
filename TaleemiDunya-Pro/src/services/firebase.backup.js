/**
 * BACKUP COPY OF Firebase Configuration
 * Created for safety restore if main file is overwritten or edited accidentally.
 * This is a copy of the original project Firebase setup.
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  connectFirestoreEmulator,
  CACHE_SIZE_UNLIMITED,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDVwn-o7X_R4JmJs8a8wE7QjFOrc21jOQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taleemidunya-pro-ed44e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "taleemidunya-pro-ed44e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taleemidunya-pro-ed44e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "909284889749",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:909284889749:web:c73f707ba6756c1823779c"
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("[Firebase] Missing critical configuration. Check .env variables.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

export const goOffline = () => disableNetwork(db);
export const goOnline = () => enableNetwork(db);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('[Firebase] Connected to local emulators');
}

export default app;
