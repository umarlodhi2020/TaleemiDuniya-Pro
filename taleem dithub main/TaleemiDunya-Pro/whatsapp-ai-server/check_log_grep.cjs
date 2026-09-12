const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const res = await ssh.execCommand('grep -rn "auth_audit.log" /home/umarhayat/ || true');
  console.log('GREP RESULT:\n' + (res.stdout || res.stderr));
  process.exit(0);
});
