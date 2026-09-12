const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLog() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log`);
  console.log("=== SERVER LOG ===");
  console.log(res.stdout);

  ssh.dispose();
}
checkLog();
