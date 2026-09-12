const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

console.log('Local Time:', new Date().toISOString());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({ preferRest: true });

db.collection('schools').limit(1).get()
  .then((snapshot) => {
    console.log('SUCCESS, empty:', snapshot.empty);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FIREBASE_ERROR:', err.message);
    process.exit(1);
  });
