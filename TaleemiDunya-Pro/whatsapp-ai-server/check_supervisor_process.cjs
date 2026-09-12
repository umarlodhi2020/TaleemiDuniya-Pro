const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectSup() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const pwdx = await ssh.execCommand(`pwdx $(pgrep -f "node server.js" | head -n 1) 2>/dev/null || lsof -p $(pgrep -f "node server.js" | head -n 1) | grep cwd`);
  console.log('=== WORKING DIRECTORY OF SUPERVISOR NODE ===');
  console.log(pwdx.stdout || pwdx.stderr);

  const siteLogs = await ssh.execCommand(`tail -n 35 /home/umarhayat/admin/logs/sites/2026/*.log | tail -n 35`);
  console.log('=== LATEST ALWAYSDATA SITE LOGS ===');
  console.log(siteLogs.stdout || siteLogs.stderr);

  ssh.dispose();
}

inspectSup().catch(e => { console.error(e); process.exit(1); });
