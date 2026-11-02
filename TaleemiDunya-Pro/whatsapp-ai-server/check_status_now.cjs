const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkStatus() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900',
    keepaliveInterval: 10000
  });

  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('=== PROCESSES ===\n', ps.stdout);

  const logs = await ssh.execCommand('tail -n 30 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== LOGS ===\n', logs.stdout);

  process.exit(0);
}

checkStatus().catch(console.error);

