const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkSessionFiles() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const sessionDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/NNRuCtHxQNjISc9EPgMs';
  const files = await ssh.execCommand(`ls -la ${sessionDir} | grep 212459700883552`);
  console.log('=== MATCHING SESSION FILES FOR THIS CONTACT ===\n', files.stdout);

  // Check how many session files exist in total
  const total = await ssh.execCommand(`ls -1 ${sessionDir} | wc -l`);
  console.log('Total files in session dir:', total.stdout);

  process.exit(0);
}

checkSessionFiles().catch(console.error);

