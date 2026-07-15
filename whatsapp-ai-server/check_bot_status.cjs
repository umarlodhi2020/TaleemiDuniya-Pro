const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBot() {
  console.log('=== CONNECTING TO ALWAYSDATA TO INSPECT WHATSAPP BOT ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const checkProc = await ssh.execCommand(`ps aux | grep -E "node|chrome|chromium" | grep -v grep`);
  console.log('=== ACTIVE NODE & CHROMIUM PROCESSES ===');
  console.log(checkProc.stdout || 'No node/chrome processes running!');

  const logRes = await ssh.execCommand(`tail -n 60 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log`);
  console.log('=== TAIL OF SERVER.LOG ===');
  console.log(logRes.stdout || logRes.stderr);

  ssh.dispose();
}

checkBot().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
