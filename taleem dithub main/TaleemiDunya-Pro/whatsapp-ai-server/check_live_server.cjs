const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const res = await ssh.execCommand('grep -i "OTP for" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
  console.log('GREP RESULT:', res.stdout || res.stderr);
  
  const tailRes = await ssh.execCommand('tail -n 30 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_audit.log');
  console.log('TAIL RESULT:', tailRes.stdout || tailRes.stderr);
  
  process.exit(0);
});
