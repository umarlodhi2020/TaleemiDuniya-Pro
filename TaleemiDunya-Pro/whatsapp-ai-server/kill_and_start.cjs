const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function killAndStart() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // Find all node PIDs and kill them
  console.log('Finding and killing all node PIDs...');
  await ssh.execCommand('kill -9 $(pgrep -u umarhayat -f node) 2>/dev/null || true');
  await ssh.execCommand('fuser -k 8100/tcp 2>/dev/null || true');
  await new Promise(r => setTimeout(r, 2000));

  const check = await ssh.execCommand('ps aux | grep node');
  console.log('Process check after kill:\n', check.stdout);

  // Clear server.log so we have clean logs
  await ssh.execCommand(`> ${remoteDir}/server.log`);

  // Start fresh server
  console.log('Starting fresh server...');
  await ssh.execCommand(`cd ${remoteDir} && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &`);

  await new Promise(r => setTimeout(r, 6000));

  const tail = await ssh.execCommand(`tail -n 40 ${remoteDir}/server.log`);
  console.log('=== LOGS AFTER FRESH START ===\n', tail.stdout);

  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('=== RUNNING PROCESSES ===\n', ps.stdout);

  process.exit(0);
}

killAndStart().catch(e => {
  console.error(e);
  process.exit(1);
});

