const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkServerLog() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const serverLog = await ssh.execCommand('tail -n 150 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== SERVER.LOG TAIL ===\n', serverLog.stdout);

  process.exit(0);
}

checkServerLog().catch(e => {
  console.error(e);
  process.exit(1);
});
