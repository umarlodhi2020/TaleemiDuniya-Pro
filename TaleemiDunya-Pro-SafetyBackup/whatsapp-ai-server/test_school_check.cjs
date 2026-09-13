const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('g:\\taleem dithub\\TaleemiDunya-Pro\\whatsapp-ai-server\\serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const schoolId = 'NNRuCtHxQNjISc9EPgMs';
  try {
    const userDoc = await db.collection('users').doc(schoolId).get();
    console.log('User Doc exists:', userDoc.exists);
    if (userDoc.exists) {
      console.log('User Doc data:', userDoc.data());
    }

    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    console.log('School Doc exists:', schoolDoc.exists);
    if (schoolDoc.exists) {
      console.log('School Doc data:', schoolDoc.data());
    }
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

run();
