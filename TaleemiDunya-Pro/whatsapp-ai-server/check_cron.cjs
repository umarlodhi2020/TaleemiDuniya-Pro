const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCronAndWatchdog() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== CRONTAB -L ===');
  const cron = await ssh.execCommand(`crontab -l 2>/dev/null || echo "No crontab found"`);
  console.log(cron.stdout || cron.stderr);

  // Check how long the current node worker has been running right now
  console.log('=== CURRENT NODE WORKER UPTIME & MEMORY ===');
  const psNode = await ssh.execCommand(`ps aux | grep node | grep -v grep || echo "No direct node under user jail"`);
  console.log(psNode.stdout);

  ssh.dispose();
}

checkCronAndWatchdog().catch(e => { console.error(e); process.exit(1); });
