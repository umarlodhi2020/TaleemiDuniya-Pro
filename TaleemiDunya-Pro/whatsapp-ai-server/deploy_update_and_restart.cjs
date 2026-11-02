const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function updateAndRestart() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('✅ Connected to SSH.');

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // 1. Backup existing server.js on remote
  console.log('📦 Backing up remote server.js...');
  await ssh.execCommand(`cp ${remoteDir}/server.js ${remoteDir}/server.js.backup_${Date.now()}`);

  // 2. Upload local server.js
  console.log('🚀 Uploading local server.js...');
  await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
  console.log('✅ server.js uploaded.');

  // 3. Kill old node process 3091614
  console.log('🛑 Restarting node process...');
  await ssh.execCommand(`pkill -9 -u umarhayat node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));

  // 4. Start fresh server.js
  console.log('▶️ Launching fresh server.js...');
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);

  // 5. Wait 6 seconds and check server.log
  console.log('⏳ Waiting for bot to initialize...');
  await new Promise(r => setTimeout(r, 6000));

  const tail = await ssh.execCommand(`tail -n 40 ${remoteDir}/server.log`);
  console.log('=== LATEST LOGS AFTER RESTART ===\n', tail.stdout);

  // 6. Check running processes
  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('=== RUNNING PROCESSES ===\n', ps.stdout);

  process.exit(0);
}

updateAndRestart().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

