cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/
cat > query_remote_firestore.js <<'EOF'
import admin from 'firebase-admin';
import fs from 'fs';

process.env.FIRESTORE_PREFER_REST = '1';
process.env.GOOGLE_CLOUD_DISABLE_GRPC = '1';

console.log("Starting script...");

const firebaseConfig = {
  projectId: 'taleemidunya-pro-ed44e'
};

if (fs.existsSync('serviceAccountKey.json')) {
  console.log("Loading serviceAccountKey.json");
  const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
  firebaseConfig.credential = admin.credential.cert(serviceAccount);
} else {
  console.log("serviceAccountKey.json NOT FOUND");
}

try {
  admin.initializeApp(firebaseConfig);
  console.log("Firebase Admin Initialized");
} catch (e) {
  console.error("Initialization Error:", e.message);
}

const db = admin.firestore();

async function run() {
  try {
    console.log("Searching for student...");
    const studentsRef = db.collection('students');

    let snapshot = await studentsRef.where('name', '==', 'Umar Hayat').limit(1).get();
    if (snapshot.empty) {
      console.log("Name not found, searching by CNIC...");
      snapshot = await studentsRef.where('fatherCnic', '==', '42201-7016279-1').limit(1).get();
    }

    if (snapshot.empty) {
      console.log("STUDENT_NOT_FOUND");
      process.exit(0);
    }

    const studentDoc = snapshot.docs[0];
    const studentData = studentDoc.data();
    console.log("STUDENT_JSON_START");
    console.log(JSON.stringify({ id: studentDoc.id, ...studentData }, null, 2));
    console.log("STUDENT_JSON_END");

    const admNo = studentData.rollNumber || studentData.rollNo || studentData.admissionNo;
    const studentName = studentData.name;

    console.log(`Searching for vouchers for: ${studentName} (AdmNo: ${admNo})`);

    const vouchersRef = db.collection('vouchers');
    let vQuery = vouchersRef;
    if (studentData.schoolId) {
      vQuery = vouchersRef.where('schoolId', '==', studentData.schoolId);
    }

    const voucherSnapshot = await vQuery.limit(50).get();

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
      console.log("No voucher found in 'vouchers'. Checking 'fees'...");
      const feesRef = db.collection('fees');
      const feeSnapshot = await feesRef.where('studentId', '==', studentDoc.id).limit(1).get();
      if (!feeSnapshot.empty) {
        console.log("VOUCHER_JSON_START");
        console.log(JSON.stringify({ id: feeSnapshot.docs[0].id, ...feeSnapshot.docs[0].data() }, null, 2));
        console.log("VOUCHER_JSON_END");
      } else {
        console.log("VOUCHER_NOT_FOUND");
      }
    }
    process.exit(0);
  } catch (err) {
    console.error("Run Error:", err);
    process.exit(1);
  }
}

run();
EOF
node query_remote_firestore.js
