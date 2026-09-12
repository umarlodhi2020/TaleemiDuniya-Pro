const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkMaster() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const psRes = await ssh.execCommand(`ps aux | grep -E "node|uwsgi|passenger|python|supervisor|194950" | grep -v grep`);
  console.log('=== PROCESS SEARCH ===');
  console.log(psRes.stdout);

  // Check alwaysdata sites list if CLI is available
  const adRes = await ssh.execCommand(`alwaysdata site list 2>/dev/null || true`);
  console.log('=== ALWAYSDATA SITE CLI ===');
  console.log(adRes.stdout);

  // Check what directory is inside /home/umarhayat/www or public_html or admin
  const lsDir = await ssh.execCommand(`ls -la /home/umarhayat/`);
  console.log('=== HOME DIRECTORY ===');
  console.log(lsDir.stdout);

  // Check if restarting via alwaysdata restart command or uwsgi reload works
  console.log('Trying uwsgi reload via touch...');
  await ssh.execCommand(`touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt /home/umarhayat/TaleemiDunya-Pro/tmp/restart.txt /home/umarhayat/tmp/restart.txt 2>/dev/null || true`);
  await ssh.execCommand(`pkill -f uwsgi 2>/dev/null || true`);

  ssh.dispose();
}

checkMaster().catch(e => { console.error(e); process.exit(1); });
