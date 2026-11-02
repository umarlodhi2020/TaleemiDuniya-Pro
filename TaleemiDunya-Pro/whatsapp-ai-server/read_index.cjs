const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const grepInit = await ssh.execCommand('grep -n "Initializing Baileys" /home/umarhayat/admin/logs/sites/2026/sites-2026-10-28.log');
  console.log('grep Init:\n', grepInit.stdout);

  // Check what files were modified today in auth_sessions or anywhere
  const findMod = await ssh.execCommand('find /home/umarhayat/ -mmin -180');
  console.log('Modified last 3 hours:\n', findMod.stdout);

  process.exit(0);
}

check().catch(console.error);
