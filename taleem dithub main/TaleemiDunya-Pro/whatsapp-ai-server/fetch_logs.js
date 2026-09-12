const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const result = await ssh.execCommand('tail -n 100 /home/umarhayat/admin/logs/sites/2026/08/07/2182239.log');
  console.log("LOGS:", result.stdout);
  process.exit(0);
}).catch(console.error);
