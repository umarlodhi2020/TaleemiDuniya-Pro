const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSpecificLogs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  // Find lines around 15:23 to 15:26 in server.log
  const res = await ssh.execCommand('grep -C 10 -E "15:2[3-5]" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log | tail -n 80');
  console.log('=== LOGS AROUND 15:24 UTC ===\n', res.stdout);

  // Also check if any error was logged with "AI BOT ERROR"
  const errs = await ssh.execCommand('grep -C 5 "AI BOT ERROR" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log | tail -n 50');
  console.log('=== AI BOT ERROR LOGS ===\n', errs.stdout);

  process.exit(0);
}

checkSpecificLogs().catch(e => {
  console.error(e);
  process.exit(1);
});

