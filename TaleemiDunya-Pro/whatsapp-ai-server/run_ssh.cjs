const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const res = await ssh.execCommand('grep -rn "TaleemiDunya" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/');
  console.log('--- GREP OUTPUT ---');
  console.log(res.stdout);
  
  process.exit(0);
});
