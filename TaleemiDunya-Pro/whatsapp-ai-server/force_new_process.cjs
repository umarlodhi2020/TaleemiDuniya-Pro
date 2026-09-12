const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function forceNewProcess() {
  console.log('=== FORCE NEW PROCESS via tmp/restart.txt ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  // STEP 0: Upload latest server.js to remote
  const path = require('path');
  const localServerJs = path.join(__dirname, 'server.js');
  const remoteServerJs = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';
  console.log('Uploading server.js to Alwaysdata...');
  try {
    await ssh.putFile(localServerJs, remoteServerJs);
    console.log('✅ server.js uploaded successfully!');
  } catch(e) {
    console.error('❌ Upload failed:', e.message);
  }

  // STEP 1: Kill old process by PID
  const pids = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('Current node procs:\n', pids.stdout || 'NONE');

  // STEP 2: Use Passenger's restart mechanism - touch tmp/restart.txt
  console.log('Touching tmp/restart.txt to force Passenger to reload app...');
  await ssh.execCommand('mkdir -p /home/umarhayat/TaleemiDunya-Pro/tmp && touch /home/umarhayat/TaleemiDunya-Pro/tmp/restart.txt');
  
  // STEP 3: Also try the API reboot endpoint to kill the old process
  console.log('Calling /api/server/reboot to kill old process...');
  try {
    await fetch('https://umarhayat.alwaysdata.net/api/server/reboot', { method: 'POST' });
  } catch(e) {
    console.log('Reboot call sent (expected timeout):', e.message);
  }

  await new Promise(r => setTimeout(r, 5000));

  // STEP 4: Verify process died and new one started
  const procs2 = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('Node procs after reboot:', procs2.stdout || 'NONE');

  // STEP 5: Wake the site to force Passenger to start new process
  console.log('Waking site with 3 requests...');
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
      const d = await r.json();
      console.log(`  Attempt ${i+1}: status=${d.status}`);
    } catch(e) {
      console.log(`  Attempt ${i+1}: error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  // STEP 6: Check logs for new code signature
  console.log('Checking latest logs for new code signatures...');
  const logs = await ssh.execCommand('tail -n 40 /home/umarhayat/admin/logs/sites/2026/*.log');
  const lines = (logs.stdout || '').split('\n').slice(-30);
  for (const l of lines) {
    if (l.includes('STDOUT') || l.includes('ERROR')) {
      console.log(' ', l.replace('[upstream] [\\d+] ', '').substring(0, 120));
    }
  }

  // STEP 7: Verify new process has new PID
  const pids2 = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('Final node procs:', pids2.stdout || 'NONE');

  ssh.dispose();
}

forceNewProcess().catch(console.error);
