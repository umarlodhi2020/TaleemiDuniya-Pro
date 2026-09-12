import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const firebaseConfig = {
  projectId: 'taleemidunya-pro-ed44e'
};

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  firebaseConfig.credential = admin.credential.cert(serviceAccount);
}

admin.initializeApp(firebaseConfig);
const db = admin.firestore();

async function run() {
  try {
    console.log("Searching for student...");
    const studentsRef = db.collection('students');

    // Search by name
    let snapshot = await studentsRef.where('name', '==', 'Umar Hayat').get();
    if (snapshot.empty) {
      // Search by fatherCnic
      snapshot = await studentsRef.where('fatherCnic', '==', '42201-7016279-1').get();
    }

    if (snapshot.empty) {
      console.log("No student found with name 'Umar Hayat' or fatherCnic '42201-7016279-1'");
      return;
    }

    const studentDoc = snapshot.docs[0];
    const studentData = studentDoc.data();
    console.log("STUDENT_JSON_START");
    console.log(JSON.stringify({ id: studentDoc.id, ...studentData }, null, 2));
    console.log("STUDENT_JSON_END");

    const admNo = studentData.rollNumber || studentData.rollNo || studentData.admissionNo;
    const studentName = studentData.name;

    console.log(`Searching for vouchers for student: ${studentName} (AdmNo: ${admNo})...`);

    // The user said check 'vouchers' collection
    const vouchersRef = db.collection('vouchers');
    let voucherSnapshot = await vouchersRef.get(); // We might need to filter manually if array-contains doesn't work for nested fields

    let foundVoucher = null;
    voucherSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
        const match = data.childrenDetails.find(child =>
          child.admNo === admNo || child.rollNo === admNo || child.name === studentName
        );
        if (match) {
          foundVoucher = { id: doc.id, ...data };
        }
      }
    });

    if (foundVoucher) {
      console.log("VOUCHER_JSON_START");
      console.log(JSON.stringify(foundVoucher, null, 2));
      console.log("VOUCHER_JSON_END");
    } else {
      console.log("No voucher found in 'vouchers' collection. Checking 'fees' collection...");
      const feesRef = db.collection('fees');
      const feeSnapshot = await feesRef.where('studentId', '==', studentDoc.id).get();
      if (!feeSnapshot.empty) {
        console.log("FEE_JSON_START");
        console.log(JSON.stringify({ id: feeSnapshot.docs[0].id, ...feeSnapshot.docs[0].data() }, null, 2));
        console.log("FEE_JSON_END");
      } else {
        console.log("No voucher or fee record found.");
      }
    }

  } catch (err) {
    console.error("Error running query:", err);
  }
}

run();
