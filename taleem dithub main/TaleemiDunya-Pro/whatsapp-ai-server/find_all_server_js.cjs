const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findAll() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`find /home/umarhayat -name "server.js" 2>/dev/null`);
  console.log('=== EVERY SERVER.JS ON HOME ===');
  console.log(res.stdout);

  // Check which one of them has "__dirname" on exactly line 554
  const lines = await ssh.execCommand(`for f in $(find /home/umarhayat -name "server.js" 2>/dev/null); do echo "=== $f ==="; sed -n '554p' "$f"; done`);
  console.log('=== LINE 554 OF EVERY SERVER.JS ===');
  console.log(lines.stdout);

  ssh.dispose();
}

findAll().catch(e => { console.error(e); process.exit(1); });
