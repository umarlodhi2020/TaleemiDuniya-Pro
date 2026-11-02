const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function searchLog() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const res = await ssh.execCommand('grep -rn "Maafi chahta" /home/umarhayat/');
  console.log('=== SEARCH MAAFI CHAHTA IN SERVER ===\n', res.stdout);

  // Check the last 100 lines of server.log
  const tail = await ssh.execCommand('tail -n 60 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
  console.log('=== SERVER.LOG LAST 60 LINES ===\n', tail.stdout);

  // Check what files are running or modified today
  const mod = await ssh.execCommand('ls -lt /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/*.log');
  console.log('=== LOG FILES ===\n', mod.stdout);

  process.exit(0);
}

searchLog().catch(e => {
  console.error(e);
  process.exit(1);
});

