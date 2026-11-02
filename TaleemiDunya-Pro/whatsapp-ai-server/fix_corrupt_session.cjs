const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function fixCorruptSession() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const sessionDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/NNRuCtHxQNjISc9EPgMs';
  
  console.log('🗑️ Removing corrupted session files for contact 212459700883552...');
  const res = await ssh.execCommand(`rm -f ${sessionDir}/session-212459700883552*`);
  console.log('Result:', res.stdout, res.stderr);

  // Restart node to reload memory cache of sessions
  console.log('🔄 Restarting node process...');
  await ssh.execCommand('kill -9 $(pgrep -u umarhayat -f node) 2>/dev/null || true');
  await new Promise(r => setTimeout(r, 1500));

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
  await ssh.execCommand(`> ${remoteDir}/server.log`);
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);
  await new Promise(r => setTimeout(r, 4000));

  const tail = await ssh.execCommand(`tail -n 30 ${remoteDir}/server.log`);
  console.log('=== LOGS AFTER CLEAN RESTART ===\n', tail.stdout);

  process.exit(0);
}

fixCorruptSession().catch(console.error);

