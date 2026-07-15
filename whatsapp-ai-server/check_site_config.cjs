const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSite() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  // Find exact timestamp of the server.js that node is executing when we hit /api/session/status
  const lsRes = await ssh.execCommand(`ls -la /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  console.log('=== FILE STATS ===');
  console.log(lsRes.stdout);

  // Check if there is another copy of server.js anywhere on /home/umarhayat
  const findRes = await ssh.execCommand(`find /home/umarhayat -name "server.js" -not -path "*/node_modules/*"`);
  console.log('=== ALL SERVER.JS COPIES ON ALWAYSDATA ===');
  console.log(findRes.stdout);

  // Check uwsgi / passenger / node config file on alwaysdata
  const configRes = await ssh.execCommand(`find /home/umarhayat -name "*uwsgi*" -o -name "*alwaysdata*" -o -name "*.json" | head -n 30`);
  console.log('=== CONFIG FILES ===');
  console.log(configRes.stdout);

  // Restart alwaysdata site by touching every possible trigger
  console.log('Touching restart triggers across all folders...');
  await ssh.execCommand(`touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  await ssh.execCommand(`mkdir -p /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp && touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt`);
  await ssh.execCommand(`mkdir -p /home/umarhayat/TaleemiDunya-Pro/tmp && touch /home/umarhayat/TaleemiDunya-Pro/tmp/restart.txt`);
  await ssh.execCommand(`mkdir -p /home/umarhayat/tmp && touch /home/umarhayat/tmp/restart.txt`);

  // Kill ALL node processes across the user account explicitly
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await ssh.execCommand(`killall -9 /usr/alwaysdata/nodejs/24/bin/node 2>/dev/null || true`);

  ssh.dispose();
}

checkSite().catch(e => { console.error(e); process.exit(1); });
