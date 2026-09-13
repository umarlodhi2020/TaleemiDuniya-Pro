const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectPorts() {
  console.log('=== INSPECTING PORTS AND PROCESSES ON ALWAYSDATA ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const psRes = await ssh.execCommand(`ps -ef | grep node | grep -v grep`);
  console.log('=== ALL NODE PROCESSES ===');
  console.log(psRes.stdout || psRes.stderr);

  const lsofRes = await ssh.execCommand(`netstat -tlpn 2>/dev/null || ss -tlpn 2>/dev/null || lsof -i :4000 2>/dev/null`);
  console.log('=== PORT 4000 USAGE ===');
  console.log(lsofRes.stdout || lsofRes.stderr);

  // Check alwaysdata sites log
  const siteLog = await ssh.execCommand(`tail -n 20 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log 2>/dev/null || tail -n 20 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log`);
  console.log('=== ALWAYSDATA SITE LOGS ===');
  console.log(siteLog.stdout || siteLog.stderr);

  ssh.dispose();
}

inspectPorts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
