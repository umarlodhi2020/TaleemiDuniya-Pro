const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkTimeAndHit() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const timeBefore = await ssh.execCommand(`date "+%H:%M:%S"`);
  console.log('=== TIME BEFORE HIT ===', timeBefore.stdout.trim());

  try {
    const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
    console.log('Hit Status:', res.status);
    const txt = await res.text();
    console.log('Response Snippet:', txt.substring(0, 180));
  } catch (e) {
    console.log('Error:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));
  const timeAfter = await ssh.execCommand(`date "+%H:%M:%S"`);
  console.log('=== TIME AFTER HIT ===', timeAfter.stdout.trim());

  const logTail = await ssh.execCommand(`tail -n 8 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log`);
  console.log('=== LATEST 8 LINES OF SITE LOG ===');
  console.log(logTail.stdout || logTail.stderr);

  // Check what processes ARE running right now
  const psNow = await ssh.execCommand(`ps aux | grep -v "ps aux" | grep -v "grep"`);
  console.log('=== ALL PROCESSES NOW ===');
  console.log(psNow.stdout);

  ssh.dispose();
}

checkTimeAndHit().catch(e => { console.error(e); process.exit(1); });
