const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function normalizeClass(c) {
  if (!c) return c;
  const str = String(c).trim().toLowerCase();
  const map = {
    '1': '1st', '1st': '1st', 'one': '1st',
    '2': '2nd', '2nd': '2nd', 'two': '2nd',
    '3': '3rd', '3rd': '3rd', 'three': '3rd',
    '4': '4th', '4th': '4th', 'four': '4th',
    '5': '5th', '5th': '5th', 'five': '5th',
    '6': '6th', '6th': '6th', 'six': '6th',
    '7': '7th', '7th': '7th', 'seven': '7th',
    '8': '8th', '8th': '8th', 'eight': '8th',
    '9': '9th', '9th': '9th', 'nine': '9th',
    '10': '10th', '10th': '10th', 'ten': '10th',
    '11': '11th', '11th': '11th', 'eleven': '11th',
    '12': '12th', '12th': '12th', 'twelve': '12th'
  };
  if (map[str]) return map[str];
  
  const match = str.match(/^(\d+)(st|nd|rd|th)?(.*)$/i);
  if (match) {
    const num = match[1];
    const rest = match[3] ? ' ' + match[3].trim() : '';
    if (map[num]) {
      return map[num] + (rest ? rest.toUpperCase() : ''); 
    }
  }
  return c;
}

async function fixCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  let updatedCount = 0;
  
  let currentBatch = db.batch();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.class) {
      const normalized = normalizeClass(data.class);
      if (normalized !== data.class) {
        currentBatch.update(doc.ref, { class: normalized });
        updatedCount++;
        count++;
        if (count === 400) {
            await currentBatch.commit();
            currentBatch = db.batch();
            count = 0;
        }
      }
    }
  }
  
  if (count > 0) {
    await currentBatch.commit();
  }
  console.log(`Updated ${updatedCount} documents in ${collectionName}`);
}

async function run() {
  await fixCollection('students');
  await fixCollection('inquiries');
  process.exit(0);
}
run();
