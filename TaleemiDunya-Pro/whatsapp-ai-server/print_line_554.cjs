const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check554() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`sed -n '545,565p' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js | nl -ba -v 545`);
  console.log('=== LINES 545 TO 565 WITH NUMBERS ===');
  console.log(res.stdout);

  // Check if there is another file being loaded
  const md5 = await ssh.execCommand(`md5sum /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== MD5 ===');
  console.log(md5.stdout);

  ssh.dispose();
}

check554().catch(e => { console.error(e); process.exit(1); });
