const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSbin() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== SEARCHING FOR SITE / RESTART / RELOAD COMMANDS ===');
  const res = await ssh.execCommand(`find /usr/bin /usr/sbin /alwaysdata/sbin /usr/alwaysdata /etc -name "*site*" -o -name "*restart*" -o -name "*reload*" -o -name "*uwsgi*" 2>/dev/null`);
  console.log(res.stdout);

  // Check what happens if we touch EVERY directory inside /home/umarhayat with restart.txt
  console.log('=== TOUCHING RESTART.TXT IN EVERY DIRECTORY UNDER HOME ===');
  await ssh.execCommand(`for d in $(find /home/umarhayat -maxdepth 3 -type d 2>/dev/null); do touch "$d/restart.txt" 2>/dev/null || true; touch "$d/tmp/restart.txt" 2>/dev/null || true; done`);

  await new Promise(r => setTimeout(r, 2000));

  console.log('=== TESTING STATUS AFTER GLOBAL TOUCH ===');
  const testRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
  console.log('Test Status:', testRes.status);
  const txt = await testRes.text();
  console.log('Snippet:', txt.substring(0, 200));

  ssh.dispose();
}

checkSbin().catch(e => { console.error(e); process.exit(1); });
