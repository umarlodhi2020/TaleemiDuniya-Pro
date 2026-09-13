const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkServerLines() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`grep -n "__dirname" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== ALL __DIRNAME IN REMOTE SERVER.JS ===');
  console.log(res.stdout);

  // Check lines 550 to 565 specifically
  const nl = await ssh.execCommand(`sed -n '550,565p' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js | nl -ba -v 550`);
  console.log('=== LINES 550 TO 565 ===');
  console.log(nl.stdout);

  ssh.dispose();
}

checkServerLines().catch(e => { console.error(e); process.exit(1); });
