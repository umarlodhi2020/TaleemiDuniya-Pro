const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function testCurl() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand('curl -v http://localhost:8100/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
  console.log('STDOUT:\n', res.stdout);
  console.log('STDERR:\n', res.stderr);

  process.exit(0);
}

testCurl().catch(console.error);

