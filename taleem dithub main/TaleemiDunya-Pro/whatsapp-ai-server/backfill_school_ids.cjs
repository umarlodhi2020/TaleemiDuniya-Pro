const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error("Please place serviceAccountKey.json in the whatsapp-ai-server directory.");
  process.exit(1);
}

const serviceAccount = require(keyPath);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function backfillSchools() {
  try {
    console.log("Starting backfill for existing schools...");
    const schoolsSnapshot = await db.collection('schools').get();
    
    let updatedCount = 0;
    for (const doc of schoolsSnapshot.docs) {
      const data = doc.data();
      let updates = {};
      
      // If no idNumber, generate a random 5-digit number
      if (!data.idNumber) {
        updates.idNumber = Math.floor(10000 + Math.random() * 90000).toString();
      }
      
      // If no Face App password, set a default one
      if (!data.password) {
        updates.password = "123456";
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('schools').doc(doc.id).update(updates);
        console.log(`Updated school ${doc.id} (${data.name}) -> ID: ${updates.idNumber || data.idNumber}`);
        updatedCount++;
      }
    }

    console.log(`\nBackfill complete! Updated ${updatedCount} schools.`);
  } catch (error) {
    console.error("Error during backfill:", error);
  } finally {
    process.exit(0);
  }
}

backfillSchools();
