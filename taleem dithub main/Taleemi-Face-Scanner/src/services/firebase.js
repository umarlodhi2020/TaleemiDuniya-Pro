/**
 * Firebase Configuration & Initialization
 * TaleemiDunya-Pro — Production-Ready Setup
 * 
 * Features:
 * - Environment variable configuration with fallbacks
 * - Firestore persistent offline cache (IndexedDB + multi-tab)
 * - Secondary Auth instance for creating users without logout
 * - Firebase Storage reference
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

// ===== CONFIGURATION =====

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDVwn-o7X_R4JmJs8a8wE7QjFOrc21jOQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taleemidunya-pro-ed44e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "taleemidunya-pro-ed44e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taleemidunya-pro-ed44e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "909284889749",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:909284889749:web:c73f707ba6756c1823779c"
};

// Validate that at least the API key and project ID are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("[Firebase] Missing critical configuration. Check .env variables.");
}

// ===== INITIALIZE FIREBASE =====

const app = initializeApp(firebaseConfig);

// Primary Auth
export const auth = getAuth(app);

// Secondary Auth instance — used to create user accounts without logging out the current admin
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

// ===== FIRESTORE WITH PERSISTENT OFFLINE CACHE =====

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  });
} catch (e) {
  // Firestore already initialized (hot module reload)
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// ===== FIREBASE STORAGE =====
export const storage = getStorage(app);

// ===== NETWORK CONTROL (for manual offline toggle) =====

/**
 * Force Firestore offline — useful for testing or manual offline mode
 */
export const goOffline = () => disableNetwork(db);

/**
 * Force Firestore back online
 */
export const goOnline = () => enableNetwork(db);

// ===== EMULATOR SUPPORT (development only) =====

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('[Firebase] Connected to local emulators');
}

export default app;
