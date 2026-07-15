const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWrapper() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const settings = await ssh.execCommand(`cat /home/umarhayat/admin/config/alwrapper/settings 2>/dev/null`);
  console.log('=== ALWRAPPER SETTINGS ===');
  console.log(settings.stdout);

  // Check if there is any uwsgi or passenger socket in /home/umarhayat/admin/
  const sockets = await ssh.execCommand(`find /home/umarhayat/admin -type s 2>/dev/null`);
  console.log('=== ADMIN SOCKETS ===');
  console.log(sockets.stdout);

  // Check if there is an alwaysdata API token or site id in environment
  const env = await ssh.execCommand(`cat /home/umarhayat/admin/config/profile/environment 2>/dev/null; env | grep -i alwaysdata`);
  console.log('=== ENV ===');
  console.log(env.stdout);

  ssh.dispose();
}

checkWrapper().catch(e => { console.error(e); process.exit(1); });
