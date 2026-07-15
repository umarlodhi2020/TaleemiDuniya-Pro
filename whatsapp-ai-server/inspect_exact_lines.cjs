const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectLines() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const topLines = await ssh.execCommand(`head -n 15 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== TOP 15 LINES OF SERVER.JS ON ALWAYSDATA ===');
  console.log(topLines.stdout);

  const grepDir = await ssh.execCommand(`grep -n "__dirname" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== ALL __DIRNAME OCCURRENCES ON ALWAYSDATA ===');
  console.log(grepDir.stdout);

  ssh.dispose();
}

inspectLines().catch(e => { console.error(e); process.exit(1); });
