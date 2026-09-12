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
    const snap = await db.collection('students').where('schoolId', '==', schoolId).limit(5).get();
    console.log('Students count:', snap.size);
    snap.forEach(doc => {
      console.log('Student ID:', doc.id, 'Data:', doc.data());
    });
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

run();
