const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand('tail -n 50 /home/umarhayat/admin/logs/sites/2026/*.log');
  console.log('=== REMOTE SITE LOGS ===');
  console.log(res.stdout || res.stderr || 'No logs found.');
  ssh.dispose();
}

checkLogs();
