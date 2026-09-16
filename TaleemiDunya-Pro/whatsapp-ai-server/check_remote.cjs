const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected ===');

  const r1 = await ssh.execCommand('grep -c "All 3 fields" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js 2>&1 || echo "NOT FOUND"');
  console.log('"All 3 fields" in server.js:', r1.stdout);

  const r2 = await ssh.execCommand('wc -l /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
  console.log('server.js line count:', r2.stdout);

  const r3 = await ssh.execCommand('head -5 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
  console.log('server.js first 5 lines:', r3.stdout);

  const r4 = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('node processes:', r4.stdout);

  const r5 = await ssh.execCommand('ls /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/*.js | head -20');
  console.log('JS files in dir:', r5.stdout);

  // Check what supervisor/uwsgi runs
  const r6 = await ssh.execCommand('cat /home/umarhayat/admin/config/supervisord.conf 2>/dev/null || cat /home/umarhayat/supervisord.conf 2>/dev/null || echo "no supervisord.conf"');
  console.log('supervisord conf:', r6.stdout.substring(0, 500));

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
