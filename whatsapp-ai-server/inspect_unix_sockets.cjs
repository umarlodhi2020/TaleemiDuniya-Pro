const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSockets() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== CHECKING ALL SOCKETS AND FILES IN TMP ===');
  const lsTmp = await ssh.execCommand(`ls -la /home/umarhayat/admin/tmp/ /home/umarhayat/admin/tmp/* 2>/dev/null`);
  console.log(lsTmp.stdout);

  // Check what processes open ANY file in /home/umarhayat right now
  const lsofHome = await ssh.execCommand(`lsof /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js 2>/dev/null || fuser /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js 2>/dev/null || echo "No direct lsof hit"`);
  console.log('=== PROCESS USING SERVER.JS ===');
  console.log(lsofHome.stdout || lsofHome.stderr);

  // Check if there is an alwaysdata uwsgi/passenger command
  const adBin = await ssh.execCommand(`which uwsgi passenger node alwrapper 2>/dev/null || true`);
  console.log('=== BINS ===');
  console.log(adBin.stdout);

  ssh.dispose();
}

checkSockets().catch(e => { console.error(e); process.exit(1); });
