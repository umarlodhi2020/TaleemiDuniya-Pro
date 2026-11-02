const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function startFresh() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // Wipe server.log so we have completely clean logs from this moment
  await ssh.execCommand(`> ${remoteDir}/server.log`);

  console.log('🚀 Starting server.js on port 8100...');
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);

  // Wait 8 seconds for server to start, load Baileys, initialize Firebase
  await new Promise(r => setTimeout(r, 8000));

  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('=== RUNNING PROCESSES ===\n', ps.stdout);

  const logs = await ssh.execCommand(`cat ${remoteDir}/server.log`);
  console.log('=== SERVER.LOG OUTPUT ===\n', logs.stdout);

  process.exit(0);
}

startFresh().catch(console.error);

