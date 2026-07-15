const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAfterKill() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== HITTING ALWAYSDATA ENDPOINTS AFTER KILLALL ===');
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
      const text = await res.text();
      console.log(`Status attempt ${i + 1}: ${res.status}`);
      if (res.status === 200) {
        console.log('Response:', text);
        break;
      } else {
        console.log('Response snippet:', text.substring(0, 250));
      }
    } catch (err) {
      console.log('Fetch error:', err.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const siteLog = await ssh.execCommand(`tail -n 25 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log`);
  console.log('=== LATEST ALWAYSDATA SITE LOGS ===');
  console.log(siteLog.stdout || siteLog.stderr);

  ssh.dispose();
}

checkAfterKill().catch(e => { console.error(e); process.exit(1); });
