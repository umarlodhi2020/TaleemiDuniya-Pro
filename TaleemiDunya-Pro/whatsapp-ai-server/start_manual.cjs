const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function startManually() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  console.log('Killing ALL old Node/PM2 processes cleanly...');
  await ssh.execCommand(`kill -9 $(pgrep node) 2>/dev/null || true`);
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Starting exact WhatsApp AI Server process in background with PORT=8100...');
  // The < /dev/null is CRITICAL to detach from SSH
  await ssh.execCommand(`cd "${remoteServerDir}" && PORT=8100 IP=:: nohup node server.js > server.log 2>&1 < /dev/null &`);
  await new Promise(r => setTimeout(r, 3000));

  const checkProc = await ssh.execCommand(`ps auxww | grep "node server.js" | grep -v grep`);
  console.log('=== ACTIVE SERVER PROCESS ===');
  console.log(checkProc.stdout);

  ssh.dispose();
  console.log('=== DONE ===');
}

startManually();
