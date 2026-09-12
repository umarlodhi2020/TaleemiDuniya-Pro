import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function test() {
  try {
    const snap = await db.collection('students').limit(1).get();
    console.log('SUCCESS! Got', snap.size, 'students');
    if (snap.size > 0) {
      console.log('Sample student:', snap.docs[0].data());
    }
  } catch (e) {
    console.error('ERROR MESSAGE:', e.message);
  }
}

test();
