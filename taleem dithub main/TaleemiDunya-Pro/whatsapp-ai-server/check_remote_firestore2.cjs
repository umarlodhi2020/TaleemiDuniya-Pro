const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Also run a test script on the remote server!
    const testCode = `
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = path.join(__dirname, 'serviceAccountKey.json');
console.log("Checking key at:", keyPath);
try {
  const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  console.log("Key project id:", sa.project_id);
  admin.initializeApp({
      credential: admin.credential.cert(sa)
  });
  console.log("App initialized.");
  const db = admin.firestore();
  console.log("DB instance created.");
  const snap = await db.collection('students').limit(1).get();
  console.log("Fetched docs:", snap.size);
  process.exit(0);
} catch(e) {
  console.error("Error:", e.message);
  process.exit(1);
}
`;
    await ssh.execCommand(`cat << 'EOF' > /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/test_firestore_remote2.mjs\n${testCode}\nEOF`);
    const runRes = await ssh.execCommand('node test_firestore_remote2.mjs', { cwd: '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server' });
    console.log("TEST RUN:\n", runRes.stdout);
    if(runRes.stderr) console.error("TEST ERR:\n", runRes.stderr);
    
    process.exit(0);
}
run();
