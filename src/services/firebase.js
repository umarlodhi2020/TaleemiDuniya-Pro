import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration from environment variables (falls back to hardcoded for backward compat)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDVwn-o7X_R4JmJs8a8wE7QjFOrc21jOQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taleemidunya-pro-ed44e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "taleemidunya-pro-ed44e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taleemidunya-pro-ed44e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "909284889749",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:909284889749:web:c73f707ba6756c1823779c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Secondary Auth instance to create users without logging out
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

// Enable IndexedDB local persistent cache for absolute offline operation
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

export const storage = getStorage(app);

export default app;
