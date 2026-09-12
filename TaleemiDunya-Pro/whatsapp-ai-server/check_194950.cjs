const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkProc() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`ps -ef`);
  console.log('=== ALL USER PROCESSES ON ALWAYSDATA ===');
  console.log(res.stdout);

  // Check the exact first 20 lines of /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js on remote
  const remoteFile = await ssh.execCommand(`head -n 25 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== HEAD OF REMOTE SERVER.JS ===');
  console.log(remoteFile.stdout);

  // Check line 554 specifically on remote
  const line554 = await ssh.execCommand(`sed -n '550,560p' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== LINES 550-560 OF REMOTE SERVER.JS ===');
  console.log(line554.stdout);

  ssh.dispose();
}

checkProc().catch(e => { console.error(e); process.exit(1); });
