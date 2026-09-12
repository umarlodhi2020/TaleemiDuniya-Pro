const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

async function deployAndWakeBot() {
  console.log('=== DEPLOYING FIXED SERVER.JS TO ALWAYSDATA ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
  const targetPath = `${remoteServerDir}/server.js`;

  const localServerJs = path.join(__dirname, 'server.js');
  const content = fs.readFileSync(localServerJs, 'utf8');
  const b64 = Buffer.from(content, 'utf8').toString('base64');

  await ssh.execCommand(`echo "${b64}" | base64 -d > "${targetPath}"`);
  console.log('server.js updated on Alwaysdata!');

  console.log('Killing old Node processes cleanly...');
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Starting exact WhatsApp AI Server process in background...');
  await ssh.execCommand(`cd "${remoteServerDir}" && nohup node server.js > server.log 2>&1 &`);
  await new Promise(r => setTimeout(r, 3000));

  const checkProc = await ssh.execCommand(`ps aux | grep "node server.js" | grep -v grep`);
  console.log('=== ACTIVE SERVER PROCESS ===');
  console.log(checkProc.stdout || 'Checking log tail...');

  // Hit the endpoints via fetch to trigger WhatsApp socket connection
  console.log('Waking up WhatsApp bot sessions via API requests...');
  try {
    const res1 = await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=default_school');
    console.log('Rules API response status:', res1.status);
    const res2 = await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: 'default_school' })
    });
    const data2 = await res2.json();
    console.log('Session Start response:', data2);
  } catch (err) {
    console.log('Fetch note:', err.message);
  }

  await new Promise(r => setTimeout(r, 4000));
  const logTail = await ssh.execCommand(`tail -n 25 "${remoteServerDir}/server.log"`);
  console.log('=== LATEST SERVER.LOG AFTER WAKEUP ===');
  console.log(logTail.stdout || logTail.stderr);

  ssh.dispose();
  console.log('=== BOT FIX & REBOOT COMPLETE ===');
}

deployAndWakeBot().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
