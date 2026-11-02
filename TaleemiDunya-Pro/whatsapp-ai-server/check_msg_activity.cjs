const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkMsgLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const msgLogs = await ssh.execCommand('grep -E "(MSG RECEIVED|AI REPLY|AI BOT ERROR|PARENT VERIFIED|ACCESS DENIED)" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log | tail -n 50');
  console.log('=== BOT MESSAGE ACTIVITY ===\n', msgLogs.stdout);

  process.exit(0);
}

checkMsgLogs().catch(e => {
  console.error(e);
  process.exit(1);
});
