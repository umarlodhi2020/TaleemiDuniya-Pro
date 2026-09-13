const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  console.log('--- DIAGNOSTIC: Checking staff collection ---');
  const snap = await db.collection('staff').get();
  console.log('Total documents in staff collection:', snap.size);

  snap.forEach(doc => {
    const data = doc.data();
    console.log('Doc ID:', doc.id);
    console.log(' - Name:', data.name);
    console.log(' - staffId:', data.staffId);
    console.log(' - cnic:', data.cnic);
    console.log(' - phone:', data.phone);
    console.log(' - whatsapp:', data.whatsapp);
    console.log(' - schoolId:', data.schoolId);
    console.log('-------------------');
  });

  console.log('\n--- DIAGNOSTIC: Search for STF-001 ---');
  const match = snap.docs.find(d => {
    const data = d.data();
    return (data.staffId === 'STF-001') || (data.cnic && data.cnic.includes('001'));
  });

  if (match) {
    console.log('MATCH FOUND!');
    console.log(JSON.stringify(match.data(), null, 2));
  } else {
    console.log('NO MATCH FOUND FOR STF-001');
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
