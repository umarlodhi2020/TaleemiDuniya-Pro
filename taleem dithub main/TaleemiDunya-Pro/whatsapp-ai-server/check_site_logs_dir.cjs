const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSiteLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`ls -R /home/umarhayat/admin/logs/sites/2026/`);
  console.log("=== SITES LOG DIR ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
checkSiteLogs();
