const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkLocks() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const locks = await ssh.execCommand('ls -la /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/.*lock* 2>/dev/null; cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/.lock* 2>/dev/null');
  console.log('=== LOCKS ===\n', locks.stdout);

  process.exit(0);
}

checkLocks().catch(console.error);

