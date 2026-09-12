const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function startViaAlwaysdata() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  console.log('Killing ALL manual Node/PM2 processes cleanly...');
  await ssh.execCommand(`pm2 kill`);
  await ssh.execCommand(`pkill -u umarhayat node 2>/dev/null || true`);
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Triggering Alwaysdata uWSGI reload to let IT start the server...');
  await ssh.execCommand(`touch /home/umarhayat/admin/restart.txt`);
  await ssh.execCommand(`touch ${remoteServerDir}/tmp/restart.txt`);
  await ssh.execCommand(`touch ${remoteServerDir}/restart.txt`);
  
  await new Promise(r => setTimeout(r, 3000));

  const checkProc = await ssh.execCommand(`ps auxww | grep "node server.js" | grep -v grep`);
  console.log('=== ACTIVE SERVER PROCESS ===');
  console.log(checkProc.stdout);

  ssh.dispose();
  console.log('=== DONE ===');
}

startViaAlwaysdata();
