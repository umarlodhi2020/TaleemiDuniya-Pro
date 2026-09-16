const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected - Finding the REAL server file ===');

  // Search ALL JS files on the server for the exact "All 3 fields (ID, WhatsApp" string
  const r1 = await ssh.execCommand('grep -rn "All 3 fields" /home/umarhayat/ 2>/dev/null | grep -v ".log" | grep -v node_modules | head -20');
  console.log('grep ALL 3 FIELDS:', r1.stdout || 'NOT FOUND');

  const r2 = await ssh.execCommand('grep -rn "WhatsApp.*valid Gmail\\|valid Gmail.*WhatsApp" /home/umarhayat/ 2>/dev/null | grep -v ".log" | grep -v node_modules | head -20');
  console.log('grep WhatsApp+Gmail:', r2.stdout || 'NOT FOUND');

  // Check www dir more carefully - cmd.cgi is in www but the server running is somewhere else
  const r3 = await ssh.execCommand('cat /home/umarhayat/www/cmd.cgi');
  console.log('www/cmd.cgi:', r3.stdout);

  // Check what sites/apps alwaysdata hosts
  const r4 = await ssh.execCommand('ls -la /home/umarhayat/admin/logs/sites/ 2>/dev/null');
  console.log('sites log dirs:', r4.stdout);

  // Find any file modified recently
  const r5 = await ssh.execCommand('find /home/umarhayat -name "*.js" -newer /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js 2>/dev/null | grep -v node_modules | head -20');
  console.log('files newer than server.js:', r5.stdout);

  // Check the grpc server.js that sync_all_server_copies also updates
  const r6 = await ssh.execCommand('grep -c "All 3 fields" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/node_modules/@grpc/grpc-js/build/src/server.js 2>/dev/null || echo "not found"');
  console.log('grpc server.js hit count:', r6.stdout);

  // Maybe alwaysdata serves from a different path via their internal routing
  const r7 = await ssh.execCommand('find /home/umarhayat -name "server.js" 2>/dev/null | grep -v node_modules | head -10');
  console.log('All server.js files:', r7.stdout);

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
