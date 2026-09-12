const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const ssh = new NodeSSH();

async function directSSHUpload() {
  console.log('=== DIRECT SSH UPLOAD OF server.js ===');
  
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const localFile = path.join(__dirname, 'server.js');
  const remoteFile = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

  // Upload server.js via SFTP
  console.log('Uploading server.js via SFTP...');
  await ssh.putFile(localFile, remoteFile);
  console.log('✅ Upload complete!');

  // Verify the uploaded file has the new code
  const check1 = await ssh.execCommand(`grep -n "default_school" ${remoteFile} | head -5`);
  console.log('Lines with "default_school":', check1.stdout || 'NONE (good!)');

  const check2 = await ssh.execCommand(`grep -n "acquireLock\\|reconnectAttempts\\|DEDUP" ${remoteFile} | head -8`);
  console.log('New features in remote file:', check2.stdout);

  const lineCount = await ssh.execCommand(`wc -l ${remoteFile}`);
  console.log('Remote file line count:', lineCount.stdout);

  // Kill all node processes
  console.log('\nKilling all node processes...');
  await ssh.execCommand('pkill -9 -f node || true');
  await new Promise(r => setTimeout(r, 3000));

  // Touch restart.txt so Passenger uses fresh file
  await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/tmp/restart.txt');
  console.log('Touched tmp/restart.txt');

  // Wake the site 
  console.log('Waking site...');
  await new Promise(r => setTimeout(r, 2000));
  try {
    const r = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    const d = await r.json();
    console.log('Status:', d.status, '| Phone:', d.phone);
  } catch(e) {
    console.log('Wake error:', e.message);
  }

  await new Promise(r => setTimeout(r, 5000));

  // Check fresh logs
  console.log('\nChecking new logs...');
  const logs = await ssh.execCommand('tail -n 25 /home/umarhayat/admin/logs/sites/2026/*.log');
  const lines = (logs.stdout || '').split('\n');
  for (const line of lines) {
    if (line.includes('STDOUT:')) {
      const content = line.split('STDOUT:').pop().trim();
      if (content) console.log(' ', content.substring(0, 120));
    }
  }

  ssh.dispose();
  console.log('\n=== DONE ===');
}

directSSHUpload().catch(console.error);
