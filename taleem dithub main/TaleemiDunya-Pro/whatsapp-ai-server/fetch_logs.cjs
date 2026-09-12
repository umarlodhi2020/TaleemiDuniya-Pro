const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`cat /home/umarhayat/admin/logs/sites/2026/sites-2026-07-23.log | tail -n 100`);
  console.log("=== SITE LOGS ===");
  console.log(res.stdout || res.stderr);
  
  ssh.dispose();
}
getLogs();
