const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartProperly() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  console.log('Killing ALL Node/PM2 processes cleanly...');
  await ssh.execCommand(`kill -9 $(pgrep node) 2>/dev/null || true`);
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await ssh.execCommand(`pkill -9 -u umarhayat node 2>/dev/null || true`);
  await ssh.execCommand(`pkill -9 -f "server.js" 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Starting exact WhatsApp AI Server process in background with PORT=8100 and no IP restriction...');
  await ssh.execCommand(`cd "${remoteServerDir}" && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &`);
  await new Promise(r => setTimeout(r, 3000));

  const checkProc = await ssh.execCommand(`ps auxww | grep "node server.js" | grep -v grep`);
  console.log('=== ACTIVE SERVER PROCESS ===');
  console.log(checkProc.stdout);

  ssh.dispose();
  console.log('=== DONE ===');
}

restartProperly();
