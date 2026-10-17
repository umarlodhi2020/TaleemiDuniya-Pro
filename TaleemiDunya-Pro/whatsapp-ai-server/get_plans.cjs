const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });
    const cmd = `cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && node --input-type=module -e "
import admin from 'firebase-admin';
import fs from 'fs';
const sa = JSON.parse(fs.readFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const sSnap = await db.collection('schools').doc('NNRuCtHxQNjISc9EPgMs').get();
console.log('---SCHOOL DATA---');
console.log(JSON.stringify(sSnap.data()));
const snap = await db.collection('plans').get();
console.log('---START_PLANS---');
console.log('COUNT:', snap.size);
snap.forEach(d => console.log('DOC_ID:', d.id, JSON.stringify(d.data())));
console.log('---END_PLANS---');
process.exit(0);
"`;
    const res = await ssh.execCommand(cmd);
    console.log(res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);
  } catch(e) {
    console.error("SSH ERROR:", e);
  }
  process.exit(0);
}
run();
