import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const appName = 'taleemidunya-pro-ed44e';
const authPort = Number(process.env.FIREBASE_AUTH_EMULATOR_PORT || process.env.VITE_AUTH_EMULATOR_PORT || 9099);
const firestorePort = Number(process.env.FIRESTORE_EMULATOR_PORT || process.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || appName;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || `localhost:${firestorePort}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || `localhost:${authPort}`;

const adminApp = getApps().length ? getApp() : initializeApp({ projectId: appName });
const auth = getAuth(adminApp);
const db = getFirestore(adminApp);

const email = 'admin@test.local';
const password = 'password123';

const seedDefaults = async () => {
  let user;

  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  if (!user) {
    user = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: 'Admin User',
    });
  }

  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email,
      name: 'Admin User',
      role: 'school-admin',
      schoolId: 'default-school',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  await db.collection('schools').doc('default-school').set(
    {
      id: 'default-school',
      name: 'Demo School',
      adminEmail: email,
      schoolId: 'default-school',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log(`Emulator seed ready: ${email} (${user.uid})`);
};

try {
  await seedDefaults();
} catch (error) {
  console.error('Emulator seed failed:', error);
  process.exitCode = 1;
}
