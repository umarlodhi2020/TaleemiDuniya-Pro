import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPhone() {
  const schoolId = 'NNRuCtHxQNjISc9EPgMs';
  console.log('--- Checking students collection for 03268973045 or 03268973046 ---');
  
  const snap = await db.collection('students').where('schoolId', '==', schoolId).get();
  snap.forEach(doc => {
    const data = doc.data();
    const str = JSON.stringify(data);
    if (str.includes('3268973045') || str.includes('3268973046')) {
      console.log(`Found student: ${doc.id} - ${data.name}`);
      console.log({
        name: data.name,
        fatherName: data.fatherName,
        phone: data.phone,
        parentPhone: data.parentPhone,
        fatherPhone: data.fatherPhone,
        motherPhone: data.motherPhone,
        guardianPhone: data.guardianPhone,
        whatsappNumber: data.whatsappNumber,
        emergencyContact: data.emergencyContact
      });
    }
  });

  console.log('--- Checking parents collection ---');
  const pSnap = await db.collection('parents').where('schoolId', '==', schoolId).get();
  pSnap.forEach(doc => {
    const data = doc.data();
    const str = JSON.stringify(data);
    if (str.includes('3268973045') || str.includes('3268973046')) {
      console.log(`Found parent doc: ${doc.id}`);
      console.log(data);
    }
  });

  process.exit(0);
}

checkPhone().catch(console.error);

