const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartProperlyIPv6() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  console.log('Killing ALL Node processes...');
  await ssh.execCommand(`kill -9 $(pgrep node) 2>/dev/null || true`);
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await ssh.execCommand(`pkill -9 -u umarhayat node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Starting with EXACT IP fd00::7:7822 and PORT 8100...');
  await ssh.execCommand(`cd "${remoteServerDir}" && PORT=8100 IP=fd00::7:7822 nohup node server.js > server.log 2>&1 < /dev/null &`);
  await new Promise(r => setTimeout(r, 3000));

  const checkProc = await ssh.execCommand(`ps auxww | grep "node server.js" | grep -v grep`);
  console.log('=== ACTIVE SERVER PROCESS ===');
  console.log(checkProc.stdout);

  ssh.dispose();
  console.log('=== DONE ===');
}

restartProperlyIPv6();
