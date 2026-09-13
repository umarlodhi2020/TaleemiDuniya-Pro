const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const snap = await db.collection('schools').get();
  console.log("Schools:");
  snap.forEach(doc => {
    console.log(doc.id, doc.data().name);
  });
  
  process.exit(0);
}
run();
