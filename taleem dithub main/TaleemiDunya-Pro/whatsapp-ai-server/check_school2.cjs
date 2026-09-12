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
  const data = doc.data();
  console.log("Name:", data.name);
  console.log("Address:", data.address);
  console.log("Phone:", data.phone);
  console.log("Admin Email:", data.adminEmail);
  console.log("Email:", data.email);
  process.exit(0);
}
run();
