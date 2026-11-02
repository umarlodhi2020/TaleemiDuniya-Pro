const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function deployClean() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('✅ Connected to Alwaysdata.');

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // 1. Upload updated server.js
  console.log('📤 Uploading fixed server.js...');
  await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
  console.log('✅ server.js uploaded.');

  // 2. Remove stale locks
  console.log('🧹 Removing stale locks...');
  await ssh.execCommand(`rm -f ${remoteDir}/auth_sessions/.*lock* ${remoteDir}/auth_sessions/.lock*`);

  // 3. Kill running node processes cleanly
  console.log('🛑 Stopping previous node processes...');
  await ssh.execCommand('killall -9 node 2>/dev/null || kill -9 $(pgrep -u umarhayat node) 2>/dev/null || true');
  await new Promise(r => setTimeout(r, 2000));

  // 4. Wipe server.log so we have a completely clean log
  await ssh.execCommand(`> ${remoteDir}/server.log`);

  // 5. Start server.js in background
  console.log('🚀 Starting fresh server.js...');
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);

  // 6. Wait 6 seconds and check log
  console.log('⏳ Waiting for bot initialization...');
  await new Promise(r => setTimeout(r, 6000));

  const tail = await ssh.execCommand(`tail -n 30 ${remoteDir}/server.log`);
  console.log('=== LATEST SERVER.LOG ===\n', tail.stdout);

  // 7. Check running processes
  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('=== ACTIVE PROCESSES ===\n', ps.stdout);

  process.exit(0);
}

deployClean().catch(console.error);

