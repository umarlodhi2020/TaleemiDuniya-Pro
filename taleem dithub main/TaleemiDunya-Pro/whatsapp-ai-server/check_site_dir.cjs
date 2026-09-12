const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSiteDir() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`ls -la /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server`);
  console.log("=== SITE DIR ===");
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}
checkSiteDir();
