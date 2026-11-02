const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkRemote() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('Connected to SSH.');
  
  const ps = await ssh.execCommand('ps aux | grep -E "(node|pm2)"');
  console.log('=== PROCESSES ===\n', ps.stdout);
  
  const pm2 = await ssh.execCommand('export PATH="$PATH:$HOME/.npm-global/bin"; pm2 list');
  console.log('=== PM2 ===\n', pm2.stdout);

  const pm2Logs = await ssh.execCommand('export PATH="$PATH:$HOME/.npm-global/bin"; pm2 logs --lines 100 --nostream');
  console.log('=== PM2 RECENT LOGS ===\n', pm2Logs.stdout, pm2Logs.stderr);

  process.exit(0);
}

checkRemote().catch(e => {
  console.error(e);
  process.exit(1);
});

