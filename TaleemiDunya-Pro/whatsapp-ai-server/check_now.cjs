const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkNow() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand('tail -n 30 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== LATEST SERVER.LOG ===\n', res.stdout);

  // Check if process 3091614 is still running
  const ps = await ssh.execCommand('ps -p 3091614 -o pid,vsz,rss,etime,cmd');
  console.log('=== PROCESS STATUS ===\n', ps.stdout);

  process.exit(0);
}

checkNow().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

