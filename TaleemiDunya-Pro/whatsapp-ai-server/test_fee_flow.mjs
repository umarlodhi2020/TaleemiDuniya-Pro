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

// Test the Fee breakdown logic
async function testFeeFlow() {
  const schoolId = 'NNRuCtHxQNjISc9EPgMs';
  const testPhone = '923133815850';

  console.log('Testing parent lookup for phone:', testPhone);

  const studentsSnap = await db.collection('students')
    .where('schoolId', '==', schoolId)
    .get();

  let matchedStudents = [];
  let parentName = '';

  studentsSnap.forEach(doc => {
    const st = { id: doc.id, ...doc.data() };
    const contactFields = [
      st.parentPhone, st.phone, st.fatherPhone, st.motherPhone,
      st.guardianPhone, st.whatsappNumber, st.emergencyContact
    ].filter(Boolean);

    const matches = contactFields.some(p => {
      const pClean = String(p).replace(/\D/g, '');
      return pClean.endsWith('3133815850');
    });

    if (matches) {
      matchedStudents.push(st);
      if (!parentName) parentName = st.fatherName || st.guardianName;
    }
  });

  console.log(`Matched ${matchedStudents.length} students:`, matchedStudents.map(s => s.name));
  console.log('Parent Name:', parentName);

  // Now check vouchers
  const vSnap = await db.collection('vouchers')
    .where('schoolId', '==', schoolId)
    .where('status', '==', 'Unpaid')
    .get();

  console.log(`Unpaid vouchers found: ${vSnap.size}`);
  vSnap.forEach(d => {
    const v = d.data();
    console.log(`- Voucher #${v.voucherNo || d.id}: Month ${v.month}, Due ${v.dueDate}, Total ${v.totalAmount || v.amount}`);
  });

  process.exit(0);
}

testFeeFlow().catch(console.error);

