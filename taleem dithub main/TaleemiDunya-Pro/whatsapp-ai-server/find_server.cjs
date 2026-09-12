const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const res = await ssh.execCommand('find /home/umarhayat/ -name "server.js" 2>/dev/null');
  console.log('FIND RESULT:\n' + res.stdout);
  process.exit(0);
});
