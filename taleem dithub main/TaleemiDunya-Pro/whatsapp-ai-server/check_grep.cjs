const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const res = await ssh.execCommand('grep -rn "OTP for" /home/umarhayat/ || true');
  console.log('GREP RESULT:', res.stdout || res.stderr);
  process.exit(0);
});
