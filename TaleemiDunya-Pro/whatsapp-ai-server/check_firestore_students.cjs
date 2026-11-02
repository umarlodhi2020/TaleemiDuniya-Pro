const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkStudents() {
  const schoolId = 'NNRuCtHxQNjISc9EPgMs';
  const snap = await db.collection('students').where('schoolId', '==', schoolId).limit(10).get();
  console.log(`Found ${snap.size} students for school ${schoolId}:`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`- ${data.name} | Father: ${data.fatherName} | Phone: ${data.parentPhone || data.phone || data.fatherPhone || data.whatsappNumber || 'N/A'}`);
  });

  // Check vouchers
  const vSnap = await db.collection('vouchers').where('schoolId', '==', schoolId).limit(5).get();
  console.log(`Found ${vSnap.size} vouchers for school ${schoolId}`);

  process.exit(0);
}

checkStudents().catch(e => {
  console.error(e);
  process.exit(1);
});

