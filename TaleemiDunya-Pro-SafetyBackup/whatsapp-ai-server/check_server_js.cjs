const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkServerJs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`head -n 20 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log("=== SERVER.JS ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
checkServerJs();
