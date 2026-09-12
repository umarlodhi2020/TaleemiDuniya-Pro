const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    const schoolId = 'NNRuCtHxQNjISc9EPgMs';
    const teacherId = 'sjnFqu2NEWj1kdz1sRm9';
    const teacherName = 'Faizan Lodhi';

    console.log(`--- DEBUGGING FOR SCHOOL: ${schoolId} ---`);

    // 1. Check classes collection
    console.log("\nChecking 'classes' collection docs for this school...");
    const classesSnap = await db.collection('classes').where('schoolId', '==', schoolId).limit(10).get();

    if (classesSnap.empty) {
        console.log("No classes found with schoolId field. Trying school_id...");
        const classesSnap2 = await db.collection('classes').where('school_id', '==', schoolId).limit(10).get();
        if (classesSnap2.empty) {
            console.log("Still no classes. Fetching ANY class to see fields...");
            const anyClass = await db.collection('classes').limit(1).get();
            if (!anyClass.empty) {
                console.log("Example Class Structure:", JSON.stringify(anyClass.docs[0].data(), null, 2));
            }
        } else {
            dumpDocs(classesSnap2);
        }
    } else {
        dumpDocs(classesSnap);
    }

    // 2. Check timetable collection
    console.log("\nChecking 'timetable' collection...");
    const ttSnap = await db.collection('timetable').where('schoolId', '==', schoolId).limit(5).get();
    if (!ttSnap.empty) {
        console.log("Found Timetable entries. Checking for Teacher link...");
        ttSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Doc ${doc.id}: teacherId=${data.teacherId}, staffId=${data.staffId}, teacherName=${data.teacherName}`);
        });
    }

    // 3. Check teacher profile again
    console.log("\nChecking Teacher Profile...");
    const teacherDoc = await db.collection('staff').doc(teacherId).get();
    if (teacherDoc.exists) {
        console.log("Teacher Data:", JSON.stringify(teacherDoc.data(), null, 2));
    }
}

function dumpDocs(snap) {
    console.log(`Found ${snap.size} docs. Printing fields of first one:`);
    const doc = snap.docs[0];
    console.log(`Doc ID: ${doc.id}`);
    console.log("Data Keys:", Object.keys(doc.data()));
    console.log("Data Preview:", JSON.stringify(doc.data(), null, 2));
}

run().catch(console.error);
