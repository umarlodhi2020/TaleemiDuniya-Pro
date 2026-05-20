import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDVwn-o7X_R4JmJs8a8wE7QjFOrc21jOQ",
  authDomain: "taleemidunya-pro-ed44e.firebaseapp.com",
  projectId: "taleemidunya-pro-ed44e",
  storageBucket: "taleemidunya-pro-ed44e.firebasestorage.app",
  messagingSenderId: "909284889749",
  appId: "1:909284889749:web:c73f707ba6756c1823779c"
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
