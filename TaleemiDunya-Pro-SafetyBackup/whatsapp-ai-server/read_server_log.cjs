const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLog() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`tail -n 40 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log`);
  console.log('=== CURRENT SERVER.LOG ===');
  console.log(res.stdout || res.stderr);

  // Check if server is responding
  try {
    const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
    const data = await statusRes.json();
    console.log('=== SESSION STATUS API ===');
    console.log(data);
  } catch (err) {
    console.log('API Status error:', err.message);
  }

  ssh.dispose();
}

checkLog().catch(e => { console.error(e); process.exit(1); });
