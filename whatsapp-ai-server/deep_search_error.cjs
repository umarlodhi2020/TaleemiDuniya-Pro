const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deepSearch() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== SEARCHING FOR ANY FILE CONTAINING 554:32 OR __dirname is not defined ===');
  const res = await ssh.execCommand(`grep -rn "554:32" /home/umarhayat/ 2>/dev/null | head -n 30`);
  console.log(res.stdout || res.stderr);

  // Check what exact line 554 is inside server.js right now
  console.log('=== LINE 550 to 560 of remote server.js RIGHT NOW ===');
  const l = await ssh.execCommand(`sed -n '550,560p' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log(l.stdout);

  ssh.dispose();
}

deepSearch().catch(e => { console.error(e); process.exit(1); });
