import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const studentId = 'G91NfJ2hgTorNssRvQ7i';
    const schoolId = 'NNRuCtHxQNjISc9EPgMs';

    console.log("--- STUDENT DATA ---");
    const studentDoc = await db.collection('students').doc(studentId).get();
    if (studentDoc.exists) {
      console.log(JSON.stringify({ id: studentDoc.id, ...studentDoc.data() }, null, 2));
    } else {
      console.log("Student not found");
    }

    console.log("\n--- VOUCHER DATA ---");
    const voucherSnap = await db.collection('vouchers')
      .where('schoolId', '==', schoolId)
      .get();

    let foundVoucher = null;
    voucherSnap.forEach(doc => {
      const data = doc.data();
      if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
        const match = data.childrenDetails.find(child =>
           child.id === studentId || child.admNo === 'G91' || child.name?.includes('Umar')
        );
        if (match) {
          foundVoucher = { id: doc.id, ...data };
        }
      }
    });

    if (foundVoucher) {
      console.log(JSON.stringify(foundVoucher, null, 2));
    } else {
      console.log("No matching voucher found");
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
