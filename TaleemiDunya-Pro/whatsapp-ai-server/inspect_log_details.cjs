const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectLogDetails() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const busy = await ssh.execCommand('grep -i "busy" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== BUSY MATCHES ===\n', busy.stdout);

  // Check the last modified timestamp of server.log
  const stat = await ssh.execCommand('stat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== STAT SERVER.LOG ===\n', stat.stdout);

  // Check date on server
  const d = await ssh.execCommand('date');
  console.log('=== DATE ===\n', d.stdout);

  process.exit(0);
}

inspectLogDetails().catch(e => {
  console.error(e);
  process.exit(1);
});
