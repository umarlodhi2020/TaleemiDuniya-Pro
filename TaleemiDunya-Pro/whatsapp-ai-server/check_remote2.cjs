const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected ===');

  // Check bot.js for the old validation string
  const r0 = await ssh.execCommand('grep -n "All 3 fields\\|WhatsApp.*valid\\|3 fields" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/bot.js 2>&1 | head -10');
  console.log('bot.js validation check:', r0.stdout || r0.stderr);

  // Check index.js
  const r1 = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/index.js');
  console.log('index.js content:', r1.stdout);

  // Check what uwsgi/alwaysdata config points to
  const r2 = await ssh.execCommand('find /home/umarhayat -name "*.ini" -o -name "*.cfg" -o -name "*.conf" 2>/dev/null | grep -v node_modules | head -20');
  console.log('config files:', r2.stdout);

  // Check if uwsgi or other processes run
  const r3 = await ssh.execCommand('cat /home/umarhayat/admin/config/uwsgi/app/taleemidunya.ini 2>/dev/null || echo "no uwsgi config"');
  console.log('uwsgi config:', r3.stdout);

  const r4 = await ssh.execCommand('ls /home/umarhayat/admin/config/ 2>/dev/null');
  console.log('admin config dir:', r4.stdout);

  const r5 = await ssh.execCommand('ls /home/umarhayat/ 2>/dev/null');
  console.log('home dir:', r5.stdout);

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
