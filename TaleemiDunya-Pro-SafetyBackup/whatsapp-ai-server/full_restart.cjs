const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fullRestart() {
  console.log('=== FULL RESTART: Kill all, clean sessions, start fresh ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  // Step 1: Force kill ALL node processes
  console.log('Step 1: Killing ALL node processes...');
  await ssh.execCommand('pkill -9 -f node || true');
  await ssh.execCommand('killall -9 node || true');
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Clean up stale auth sessions (default_school and lock files)
  console.log('Step 2: Cleaning stale default_school session and lock files...');
  await ssh.execCommand('rm -rf /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/default_school');
  await ssh.execCommand('rm -f /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/.lock_*');
  await ssh.execCommand('rm -f /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/.ws_lock');

  // Step 3: Verify server.js has new code (should NOT have startWhatsAppSession('default_school'))
  console.log('Step 3: Verifying new code on remote...');
  const checkOld = await ssh.execCommand("grep -n \"startWhatsAppSession('default_school')\" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js");
  if (checkOld.stdout) {
    console.log('WARNING: Old code still present! Lines:', checkOld.stdout);
  } else {
    console.log('✅ New code confirmed - no default_school session startup');
  }
  
  const checkNew = await ssh.execCommand("grep -n 'acquireLock\\|reconnectAttempts\\|lastReplySentAt\\|DEDUP' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js");
  console.log('New features found:', checkNew.stdout ? 'YES' : 'NO');
  if (checkNew.stdout) {
    const lines = checkNew.stdout.split('\n');
    for (const line of lines.slice(0, 8)) console.log('  ', line);
  }

  // Step 4: Confirm no node processes running
  console.log('Step 4: Verifying no node processes...');
  const procs = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('Running node procs:', procs.stdout || 'NONE (good!)');

  // Step 5: Wake the site by hitting the API - Passenger will start a FRESH process with the new code
  console.log('Step 5: Waking up Alwaysdata site (Passenger will start new process)...');
  for (let i = 0; i < 3; i++) {
    try {
      const resp = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
      const data = await resp.json();
      console.log(`  Wake attempt ${i+1}: Status=${data.status}, Phone=${data.phone}`);
      if (data.status === 'CONNECTED') break;
    } catch(e) {
      console.log(`  Wake attempt ${i+1}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Step 6: Check running processes now
  console.log('Step 6: Checking processes after wake...');
  const finalProcs = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('Running node procs:', finalProcs.stdout || 'NONE');

  // Step 7: Check latest logs for the new process
  console.log('Step 7: Latest site logs...');
  const logs = await ssh.execCommand('tail -n 30 /home/umarhayat/admin/logs/sites/2026/*.log');
  const logLines = (logs.stdout || '').split('\n');
  for (const line of logLines.slice(-20)) {
    console.log('  ', line);
  }

  ssh.dispose();
  console.log('\n=== FULL RESTART COMPLETE ===');
}

fullRestart().catch(console.error);
