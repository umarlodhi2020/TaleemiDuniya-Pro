const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

async function forceUpload() {
  console.log('=== FORCE UPLOADING SERVER.JS TO ALWAYSDATA ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remotePath = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';
  const localPath = path.join(__dirname, 'server.js');
  const content = fs.readFileSync(localPath, 'utf8');

  // Verify local content has __dirname fix
  if (!content.includes('const __dirname = path.dirname(__filename)')) {
    console.error('ERROR: Local server.js is missing the __dirname fix!');
    process.exit(1);
  }

  const b64 = Buffer.from(content, 'utf8').toString('base64');
  await ssh.execCommand(`echo "${b64}" | base64 -d > "${remotePath}"`);
  console.log('Successfully wrote server.js to Alwaysdata!');

  // Verify on server
  const verifyRes = await ssh.execCommand(`grep "__dirname = path.dirname" "${remotePath}"`);
  console.log('=== VERIFICATION ON REMOTE SERVER ===');
  console.log(verifyRes.stdout || 'Verification failed!');

  // Kill the supervisor node process cleanly so PM2/Alwaysdata restarts with new code
  console.log('Restarting Alwaysdata supervisor node process...');
  await ssh.execCommand(`pkill -f "node server.js" 2>/dev/null || killall -9 node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 3000));

  // Check if supervisor respawned or start manually if needed
  const checkProc = await ssh.execCommand(`ps -ef | grep node | grep -v grep`);
  console.log('=== RESPONSIVE NODE PROCESSES ===');
  console.log(checkProc.stdout);

  // Test hitting the site 5 times to wake supervisor
  for (let i = 0; i < 3; i++) {
    try {
      await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=default_school');
    } catch (e) {}
  }

  await new Promise(r => setTimeout(r, 2000));
  const tailLog = await ssh.execCommand(`tail -n 25 /home/umarhayat/admin/logs/sites/2026/*.log | tail -n 25`);
  console.log('=== NEW ALWAYSDATA SITE LOGS ===');
  console.log(tailLog.stdout || tailLog.stderr);

  ssh.dispose();
  console.log('=== FORCE UPLOAD & REBOOT SUCCESSFUL ===');
}

forceUpload().catch(err => {
  console.error(err);
  process.exit(1);
});
