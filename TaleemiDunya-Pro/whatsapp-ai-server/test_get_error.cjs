const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand('tail -n 100 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/bot.log');
  console.log('=== REMOTE BOT.LOG BOTTOM ===');
  console.log(res.stdout || res.stderr || 'No matches found.');
  ssh.dispose();
}

check();
