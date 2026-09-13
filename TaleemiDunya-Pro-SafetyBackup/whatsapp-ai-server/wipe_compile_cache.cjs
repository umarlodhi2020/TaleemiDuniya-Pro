const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function wipeCacheAndTest() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== WIPING NODE COMPILE CACHE & TOUCHING ADMIN RESTART ===');
  await ssh.execCommand(`rm -rf /home/umarhayat/admin/tmp/node-compile-cache/* 2>/dev/null || true`);
  await ssh.execCommand(`touch /home/umarhayat/admin/tmp/restart.txt /home/umarhayat/admin/tmp/tmp/restart.txt /home/umarhayat/restart.txt 2>/dev/null || true`);
  await ssh.execCommand(`kill -9 194950 $(pgrep -u umarhayat node) 2>/dev/null || true`);

  await new Promise(r => setTimeout(r, 3000));

  console.log('=== HITTING SESSION STATUS TO VERIFY FRESH CODE ===');
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
      const text = await res.text();
      console.log(`Attempt ${i + 1} (${res.status}):`, text.substring(0, 300));
      if (res.status === 200 && text.includes('{')) {
        console.log('🎉 SUCCESS! Fresh code loaded and API responded!');
        break;
      }
    } catch (err) {
      console.log(`Attempt ${i + 1} Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const siteLog = await ssh.execCommand(`tail -n 25 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log`);
  console.log('=== LATEST SITE LOGS ===');
  console.log(siteLog.stdout || siteLog.stderr);

  ssh.dispose();
}

wipeCacheAndTest().catch(e => { console.error(e); process.exit(1); });
