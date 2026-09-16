const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected ===');

  // 1. Find which file the LIVE server is actually serving from
  // The cmd.cgi runs "node server.js" at PORT=8100
  // But alwaysdata reverse-proxies to that port
  // Check what the LIVE /api/mobile/auth/request-otp returns right now
  const r1 = await ssh.execCommand(`curl -s -X POST "https://umarhayat.alwaysdata.net/api/mobile/auth/request-otp" -H "Content-Type: application/json" -d '{"cnic":"faizan7263","email":"dhilodhi0263@gmail.com"}'`);
  console.log('LIVE API response:', r1.stdout);

  // 2. Check the exact line in server.js that handles it
  const r2 = await ssh.execCommand('sed -n "1555,1580p" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
  console.log('server.js lines 1555-1580:', r2.stdout);

  // 3. Trigger restart via cmd.cgi
  const r3 = await ssh.execCommand('curl -s "https://umarhayat.alwaysdata.net/cmd.cgi"');
  console.log('cmd.cgi trigger:', r3.stdout);

  await new Promise(r => setTimeout(r, 8000));

  // 4. Test again after restart
  const r4 = await ssh.execCommand(`curl -s -X POST "https://umarhayat.alwaysdata.net/api/mobile/auth/request-otp" -H "Content-Type: application/json" -d '{"cnic":"faizan7263","email":"dhilodhi0263@gmail.com"}'`);
  console.log('LIVE API response after restart:', r4.stdout);

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
