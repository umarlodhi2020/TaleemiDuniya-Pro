const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testRun() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 IP=fd00::7:7822 timeout 5 node server.js`);
  console.log("=== OUTPUT ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
testRun();
