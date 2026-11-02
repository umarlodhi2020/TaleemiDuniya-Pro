const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function fix() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
  const sessionDir = `${remoteDir}/auth_sessions/session_NNRuCtHxQNjISc9EPgMs`;

  // 1. Remove all corrupted session files and lock files
  console.log('🧹 Removing locks and corrupted session keys...');
  await ssh.execCommand(`rm -f ${remoteDir}/auth_sessions/.*lock* ${remoteDir}/auth_sessions/.lock*`);
  await ssh.execCommand(`rm -f ${sessionDir}/session-212459700883552*`);

  // 2. Kill all manual and upstream node processes
  console.log('🛑 Killing all node processes so Alwaysdata restarts upstream cleanly...');
  await ssh.execCommand('pkill -9 -u umarhayat -f node');
  
  // 3. Touch restart.txt
  await ssh.execCommand('touch /home/umarhayat/admin/config/restart.txt /home/umarhayat/restart.txt');

  // 4. Wait 12 seconds for Alwaysdata supervisor to start the single upstream worker
  console.log('⏳ Waiting 12 seconds for Alwaysdata supervisor to start clean upstream...');
  await new Promise(r => setTimeout(r, 12000));

  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('Running processes:\n', ps.stdout);

  // 5. Test the warning endpoint
  const warningRes = await fetch('https://umarhayat.alwaysdata.net/api/settings/warning?schoolId=NNRuCtHxQNjISc9EPgMs');
  const warningJson = await warningRes.json();
  console.log('✅ Live /api/settings/warning API response:\n', warningJson);

  // 6. Test session status
  const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
  const statusJson = await statusRes.json();
  console.log('✅ Live session status:\n', statusJson);

  process.exit(0);
}

fix().catch(console.error);
