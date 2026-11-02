const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function restartExact() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // Kill exact PIDs
  await ssh.execCommand('kill -9 917987 917986 2>/dev/null || true');
  await new Promise(r => setTimeout(r, 1500));

  // Check if any node is still alive
  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('After kill:\n', ps.stdout);

  // Clear log
  await ssh.execCommand(`> ${remoteDir}/server.log`);

  // Start fresh server
  console.log('Starting fresh server...');
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);

  await new Promise(r => setTimeout(r, 6000));

  const tail = await ssh.execCommand(`cat ${remoteDir}/server.log`);
  console.log('=== LATEST SERVER.LOG ===\n', tail.stdout);

  const psAfter = await ssh.execCommand('ps aux | grep node');
  console.log('=== RUNNING PROCESSES ===\n', psAfter.stdout);

  process.exit(0);
}

restartExact().catch(console.error);

