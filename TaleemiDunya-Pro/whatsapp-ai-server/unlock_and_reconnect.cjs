const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function unlockAndReconnect() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  console.log('🔓 Removing all stale lock files...');
  await ssh.execCommand(`rm -f ${remoteDir}/auth_sessions/.*lock* ${remoteDir}/auth_sessions/.lock*`);

  console.log('🌐 Triggering session start via curl on port 8100...');
  const trigger = await ssh.execCommand(`curl -s -X POST http://localhost:8100/api/session/start -H "Content-Type: application/json" -d '{"schoolId":"NNRuCtHxQNjISc9EPgMs"}'`);
  console.log('Trigger response:', trigger.stdout);

  console.log('⏳ Waiting 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));

  const tail = await ssh.execCommand(`tail -n 20 ${remoteDir}/server.log`);
  console.log('=== LOGS AFTER UNLOCK & RECONNECT ===\n', tail.stdout);

  process.exit(0);
}

unlockAndReconnect().catch(console.error);

