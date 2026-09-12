const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAdminTree() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const lsAdmin = await ssh.execCommand(`ls -la /home/umarhayat/admin/ /home/umarhayat/admin/config/ /home/umarhayat/admin/config/alwrapper/ /home/umarhayat/admin/config/profile/ 2>/dev/null`);
  console.log('=== ADMIN DIR CONTENTS ===');
  console.log(lsAdmin.stdout);

  // Check if there is any uwsgi or site config inside /etc or /var or /usr/alwaysdata accessible to us
  const envAll = await ssh.execCommand(`env`);
  console.log('=== ALL ENVIRONMENT VARIABLES ===');
  console.log(envAll.stdout);

  // Can we send a SIGHUP to 194950 or uwsgi?
  console.log('Testing signal to uwsgi master...');
  await ssh.execCommand(`kill -HUP 194950 2>/dev/null || kill -1 194950 2>/dev/null || true`);

  ssh.dispose();
}

checkAdminTree().catch(e => { console.error(e); process.exit(1); });
