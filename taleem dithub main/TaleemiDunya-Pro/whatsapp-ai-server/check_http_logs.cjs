const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkHttpLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`tail -n 50 /home/umarhayat/admin/logs/http/2026/http-2026-07-23.log | grep 502`);
  console.log("=== HTTP LOG ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
checkHttpLogs();
