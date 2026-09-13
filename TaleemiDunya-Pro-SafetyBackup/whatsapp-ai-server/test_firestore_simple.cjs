const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();
db.collection('schools').doc('default_school').get().then(doc => {
  console.log('Firestore test:', doc.exists ? 'SUCCESS' : 'NOT FOUND');
  process.exit(0);
}).catch(err => {
  console.error('Firestore Error:', err);
  process.exit(1);
});
