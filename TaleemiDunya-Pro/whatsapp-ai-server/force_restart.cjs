const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected ===');

  // The old process is PID 2777681. Let's try to kill it directly and all node processes
  const r1 = await ssh.execCommand('kill -9 2777681 2>&1; killall -9 node 2>&1; pkill -9 -u umarhayat node 2>&1; echo "kill done"');
  console.log('kill result:', r1.stdout, r1.stderr);

  // Also delete any lock files
  const r2 = await ssh.execCommand('rm -f /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/*/lock.json 2>/dev/null; rm -f /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/.bot-lock 2>/dev/null; ls /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/ 2>/dev/null');
  console.log('lock files:', r2.stdout);

  await new Promise(r => setTimeout(r, 2000));

  // Now start a FRESH server
  const r3 = await ssh.execCommand('cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 nohup node index.js > server.log 2>&1 < /dev/null & echo "Started PID: $!"');
  console.log('start result:', r3.stdout, r3.stderr);

  await new Promise(r => setTimeout(r, 5000));

  // Verify
  const r4 = await ssh.execCommand('ps aux | grep -E "node|index.js|server.js" | grep -v grep');
  console.log('processes:', r4.stdout);

  const r5 = await ssh.execCommand('tail -15 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('server.log:', r5.stdout);

  // Test the endpoint
  const r6 = await ssh.execCommand('curl -s -X POST https://umarhayat.alwaysdata.net/api/mobile/auth/request-otp -H "Content-Type: application/json" -d \'{"cnic":"test","email":"test@gmail.com"}\' 2>&1 | head -5');
  console.log('API test response:', r6.stdout);

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
