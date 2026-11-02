const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function testKill() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand('kill -9 3091614 3091613; echo "EXIT: $?"');
  console.log(res.stdout, res.stderr);

  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('PS:\n', ps.stdout);

  process.exit(0);
}

testKill().catch(console.error);

