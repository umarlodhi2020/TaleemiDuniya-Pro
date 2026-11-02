const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAdmin() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const res = await ssh.execCommand('du -sh /home/umarhayat/admin/*');
  console.log('=== ADMIN DIR CONTENTS ===\n', res.stdout);

  // Check quota command
  const q = await ssh.execCommand('/usr/bin/quota -u umarhayat -v || quota -v');
  console.log('=== QUOTA ===\n', q.stdout, q.stderr);

  process.exit(0);
}

checkAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
