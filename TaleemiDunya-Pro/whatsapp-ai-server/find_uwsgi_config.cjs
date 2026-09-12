const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkUwsgi() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const logs = await ssh.execCommand(`head -n 25 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log`);
  console.log('=== LOG HEAD ===');
  console.log(logs.stdout);

  // Find ANY file modified today inside /home/umarhayat/admin/ or /tmp
  const modToday = await ssh.execCommand(`find /home/umarhayat/admin /home/umarhayat/tmp -mtime -1 2>/dev/null`);
  console.log('=== MODIFIED IN ADMIN/TMP TODAY ===');
  console.log(modToday.stdout);

  // Check if we can find any file containing 194950 or uwsgi
  const grepPid = await ssh.execCommand(`grep -rn "194950" /home/umarhayat/admin/ 2>/dev/null || true`);
  console.log('=== GREP 194950 ===');
  console.log(grepPid.stdout);

  ssh.dispose();
}

checkUwsgi().catch(e => { console.error(e); process.exit(1); });
