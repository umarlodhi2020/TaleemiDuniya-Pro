const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected ===');

  // The cmd.cgi runs: PORT=8100 nohup node server.js
  // Let's check if there's a PORT mapping / reverse proxy
  // First let's check what request-otp looks like in current server.js
  const r1 = await ssh.execCommand('grep -n "All 3 fields\\|3 fields\\|WhatsApp.*valid\\|valid Gmail\\|cnic.*phone.*email\\|phone.*required" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js | head -20');
  console.log('Validation strings in server.js:', r1.stdout || 'NONE FOUND');

  const r2 = await ssh.execCommand('grep -n "request-otp" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js | head -5');
  console.log('request-otp line:', r2.stdout);

  // Check server.log for recent errors
  const r3 = await ssh.execCommand('tail -30 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log 2>/dev/null || echo "no server.log"');
  console.log('server.log tail:', r3.stdout);

  // Now actually RESTART the server via cmd.cgi and check
  console.log('=== RESTARTING SERVER ===');
  const r4 = await ssh.execCommand('pkill -9 -u umarhayat node 2>/dev/null; pkill -9 -f server.js 2>/dev/null; sleep 1; cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &');
  console.log('restart result:', r4.stdout, r4.stderr);

  await new Promise(r => setTimeout(r, 5000));

  const r5 = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('node processes after restart:', r5.stdout);

  const r6 = await ssh.execCommand('tail -20 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log 2>/dev/null');
  console.log('server.log after restart:', r6.stdout);

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
