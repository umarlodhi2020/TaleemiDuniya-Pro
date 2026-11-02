const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkStartup() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const cron = await ssh.execCommand('crontab -l');
  console.log('=== CRONTAB ===\n', cron.stdout, cron.stderr);

  // Check alwaysdata sites configuration or environment
  const ad = await ssh.execCommand('ls -la /home/umarhayat/admin/config/');
  console.log('=== ADMIN CONFIG ===\n', ad.stdout);

  process.exit(0);
}

checkStartup().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

