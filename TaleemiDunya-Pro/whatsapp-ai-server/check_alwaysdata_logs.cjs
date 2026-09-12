const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`tail -n 30 /home/umarhayat/admin/logs/sites/sites-2026-07-23.log`);
  console.log("=== SITES LOG ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
checkLogs();
