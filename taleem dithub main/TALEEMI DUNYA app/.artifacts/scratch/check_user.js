const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function check() {
    console.log("Checking Staff collection for ID '001' or 'T001'...");
    const staffRef = db.collection('staff');

    // Find Faizan Lodhi to see his schoolId
    const faizanSnap = await staffRef.where('name', '>=', 'Faizan').get();
    if (!faizanSnap.empty) {
        faizanSnap.forEach(doc => {
            const d = doc.data();
            console.log(`Found Teacher '${d.name}': ID=${doc.id}, schoolId=${d.schoolId} (Type: ${typeof d.schoolId})`);
            checkClasses(d.schoolId);
        });
    } else {
        console.log("Faizan Lodhi not found in Staff.");
    }
}

async function checkClasses(schoolId) {
    console.log(`\nChecking Classes collection for schoolId: '${schoolId}'`);
    const classesSnap = await db.collection('classes').where('schoolId', '==', schoolId).get();
    if (!classesSnap.empty) {
        console.log(`Found ${classesSnap.size} classes for schoolId: ${schoolId}`);
        classesSnap.forEach(doc => {
            console.log(` - Class: ${doc.data().name || doc.data().className}, ID: ${doc.id}`);
        });
    } else {
        console.log(`No classes found for schoolId: '${schoolId}'. Trying to find any class to check its schoolId type...`);
        const allClassSnap = await db.collection('classes').limit(1).get();
        if (!allClassSnap.empty) {
            const firstClass = allClassSnap.docs[0].data();
            console.log(`First class in DB: schoolId=${firstClass.schoolId} (Type: ${typeof firstClass.schoolId})`);
        }
    }
}

check().catch(console.error);
