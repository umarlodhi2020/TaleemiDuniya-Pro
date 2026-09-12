const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const doc = await db.collection('schools').doc('NNRuCtHxQNjISc9EPgMs').get();
  console.log("School Data:", doc.data());
  process.exit(0);
}
run();
