const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWww() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const lsWww = await ssh.execCommand(`ls -la /home/umarhayat/www/ /home/umarhayat/www/* 2>/dev/null`);
  console.log('=== WWW DIRECTORY ===');
  console.log(lsWww.stdout);

  // Check if there is a symlink or another directory
  const checkLink = await ssh.execCommand(`readlink -f /home/umarhayat/www /home/umarhayat/TaleemiDunya-Pro`);
  console.log('=== REAL PATHS ===');
  console.log(checkLink.stdout);

  // Check where server.js inside /home/umarhayat/admin/logs/sites/2026/ says it is
  const grepLog = await ssh.execCommand(`grep -o "/home/umarhayat/[^ :]*" /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log | sort | uniq`);
  console.log('=== PATHS EXECUTED IN SITE LOG ===');
  console.log(grepLog.stdout);

  ssh.dispose();
}

checkWww().catch(e => { console.error(e); process.exit(1); });
