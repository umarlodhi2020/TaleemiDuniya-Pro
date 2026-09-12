import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Zips all JSON files in the session directory and uploads to Firestore
 * @param {string} schoolId 
 * @param {string} sessionDir 
 * @param {object} db - Firebase Firestore db instance
 */
export async function uploadSessionToFirestore(schoolId, sessionDir, db) {
  try {
    if (!fs.existsSync(sessionDir)) return;
    
    const files = fs.readdirSync(sessionDir);
    const sessionData = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(sessionDir, file), 'utf8');
        sessionData[file] = content;
      }
    }
    
    if (Object.keys(sessionData).length === 0) return;
    
    // Compress to base64
    const jsonString = JSON.stringify(sessionData);
    const base64Zip = zlib.gzipSync(jsonString).toString('base64');
    
    await db.collection('whatsapp_sessions').doc(schoolId).set({
      base64Zip: base64Zip,
      updatedAt: new Date()
    });
    console.log(`☁️ [FIREBASE SYNC] Uploaded session for ${schoolId} (${Object.keys(sessionData).length} files)`);
  } catch (err) {
    console.error(`❌ [FIREBASE SYNC] Failed to upload session for ${schoolId}:`, err.message);
  }
}

/**
 * Downloads the compressed session from Firestore and restores JSON files to disk
 * @param {string} schoolId 
 * @param {string} sessionDir 
 * @param {object} db - Firebase Firestore db instance
 */
export async function downloadSessionFromFirestore(schoolId, sessionDir, db) {
  try {
    const doc = await db.collection('whatsapp_sessions').doc(schoolId).get();
    if (!doc.exists || !doc.data().base64Zip) {
      console.log(`☁️ [FIREBASE SYNC] No existing session found in Firebase for ${schoolId}`);
      return;
    }
    
    const base64Zip = doc.data().base64Zip;
    const jsonString = zlib.gunzipSync(Buffer.from(base64Zip, 'base64')).toString('utf8');
    const sessionData = JSON.parse(jsonString);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    for (const [filename, content] of Object.entries(sessionData)) {
      fs.writeFileSync(path.join(sessionDir, filename), content, 'utf8');
    }
    console.log(`☁️ [FIREBASE SYNC] Downloaded and restored session for ${schoolId} (${Object.keys(sessionData).length} files)`);
  } catch (err) {
    console.error(`❌ [FIREBASE SYNC] Failed to download session for ${schoolId}:`, err.message);
  }
}
