const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkNow() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand('tail -n 25 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== LATEST 25 LINES OF SERVER.LOG ===\n', res.stdout);

  process.exit(0);
}

checkNow().catch(console.error);

