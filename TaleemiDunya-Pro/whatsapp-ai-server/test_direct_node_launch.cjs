const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testDirect() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== RUNNING NODE DIRECTLY VIA SSH ===');
  // Run node for 4 seconds and capture exact stdout/stderr
  const runRes = await ssh.execCommand(`timeout 4s /usr/alwaysdata/nodejs/24/bin/node /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js 2>&1 || true`);
  console.log('=== DIRECT NODE OUTPUT ===');
  console.log(runRes.stdout || runRes.stderr);

  ssh.dispose();
}

testDirect().catch(e => { console.error(e); process.exit(1); });
