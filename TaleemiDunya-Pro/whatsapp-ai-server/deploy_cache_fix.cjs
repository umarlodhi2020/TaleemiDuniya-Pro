const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function deployCacheFix() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('✅ Connected to Alwaysdata.');

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // 1. Upload fixed server.js
  console.log('📤 Uploading updated server.js with 1-min cache TTL...');
  await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
  console.log('✅ server.js uploaded.');

  // 2. Remove stale locks
  await ssh.execCommand(`rm -f ${remoteDir}/auth_sessions/.*lock* ${remoteDir}/auth_sessions/.lock*`);

  // 3. Restart node process cleanly
  console.log('🔄 Restarting node process...');
  await ssh.execCommand('kill -9 $(pgrep -u umarhayat -f node) 2>/dev/null || true');
  await new Promise(r => setTimeout(r, 1500));

  await ssh.execCommand(`> ${remoteDir}/server.log`);
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);

  console.log('⏳ Waiting 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));

  const status = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
  const json = await status.json();
  console.log('Live session status:', json);

  process.exit(0);
}

deployCacheFix().catch(console.error);

