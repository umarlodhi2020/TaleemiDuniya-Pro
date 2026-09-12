const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkProcesses() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`ps auxww | grep node`);
  console.log("=== PROCESSES ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
checkProcesses();
