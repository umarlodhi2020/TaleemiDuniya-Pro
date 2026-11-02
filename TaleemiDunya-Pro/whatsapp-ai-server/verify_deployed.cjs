const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function verify() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const checkTtl = await ssh.execCommand('grep -n "60000" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
  const checkWarning = await ssh.execCommand('grep -n "settings/warning" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
  
  console.log('=== VERIFY LIVE SERVER.JS ===');
  console.log('TTL check (60000ms):', checkTtl.stdout);
  console.log('Warning check:', checkWarning.stdout);

  // Check live status
  const localCurl = await ssh.execCommand('curl -i "http://localhost:8100/api/settings/warning?schoolId=NNRuCtHxQNjISc9EPgMs"');
  console.log('Local curl stdout:\n', localCurl.stdout);
  console.log('Local curl stderr:\n', localCurl.stderr);
  const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
  const statusJson = await statusRes.json();
  console.log('Live status API:', statusJson);

  process.exit(0);
}

verify().catch(console.error);

