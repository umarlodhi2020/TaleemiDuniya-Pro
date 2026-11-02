const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkLidAndRestart() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  // Check lid mapping
  const lidMap = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/lid_mapping.json 2>/dev/null || cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/NNRuCtHxQNjISc9EPgMs/lid_mapping.json 2>/dev/null');
  console.log('=== LID MAPPINGS ===\n', lidMap.stdout);

  // Check what school session is loaded
  const sessionDirs = await ssh.execCommand('ls -l /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/');
  console.log('=== AUTH SESSIONS ===\n', sessionDirs.stdout);

  process.exit(0);
}

checkLidAndRestart().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

