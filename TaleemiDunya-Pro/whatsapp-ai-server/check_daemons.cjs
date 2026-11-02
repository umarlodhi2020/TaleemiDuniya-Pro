const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkDaemons() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const ps = await ssh.execCommand('ps -ef | grep -E "node|server|alwaysdata"');
  console.log('=== ALL NODE / ALWAYSDATA PROCESSES ===\n', ps.stdout);

  // Check alwaysdata user program configs
  const sites = await ssh.execCommand('ls -la /home/umarhayat/admin/config/alwrapper/');
  console.log('=== ALWRAPPER ===\n', sites.stdout);

  process.exit(0);
}

checkDaemons().catch(console.error);

