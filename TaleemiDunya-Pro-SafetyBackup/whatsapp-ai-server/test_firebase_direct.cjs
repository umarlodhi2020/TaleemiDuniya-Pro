const originalDateNow = Date.now;
Date.now = () => originalDateNow() - (3.5 * 60 * 1000);

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

db.collection('schools').limit(1).get()
  .then((snapshot) => {
    console.log('SUCCESS, empty:', snapshot.empty);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FIREBASE_ERROR:', err);
    process.exit(1);
  });
