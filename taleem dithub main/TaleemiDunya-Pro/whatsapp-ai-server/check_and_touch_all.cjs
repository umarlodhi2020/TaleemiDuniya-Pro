const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function touchAllAndTest() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('Touching every restart.txt file across www and home right now...');
  await ssh.execCommand(`touch /home/umarhayat/www/restart.txt /home/umarhayat/www/tmp/restart.txt /home/umarhayat/restart.txt /home/umarhayat/TaleemiDunya-Pro/restart.txt /home/umarhayat/TaleemiDunya-Pro/tmp/restart.txt /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  
  await new Promise(r => setTimeout(r, 4000));

  console.log('=== HITTING SITE STATUS ===');
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
      const text = await res.text();
      console.log(`Attempt ${i + 1} (${res.status}):`, text.substring(0, 200));
      if (res.status === 200) {
        break;
      }
    } catch (e) {
      console.log(`Attempt ${i + 1} Error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const logTail = await ssh.execCommand(`tail -n 25 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log`);
  console.log('=== LATEST SITE LOG TAIL ===');
  console.log(logTail.stdout || logTail.stderr);

  ssh.dispose();
}

touchAllAndTest().catch(e => { console.error(e); process.exit(1); });
