const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkProc() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`for f in /proc/[0-9]*/cmdline; do p=$(echo $f | cut -d/ -f3); cmd=$(cat $f | tr "\\0" " " 2>/dev/null); if [ ! -z "$cmd" ]; then echo "$p: $cmd"; fi; done`);
  console.log('=== ALL READABLE PROCESSES ON SYSTEM ===');
  console.log(res.stdout);

  // Check if we can kill any python/uwsgi/alwrapper
  const kills = await ssh.execCommand(`pkill -9 -f alwrapper 2>/dev/null; pkill -9 -f uwsgi 2>/dev/null; pkill -9 -f node 2>/dev/null; true`);
  console.log('=== PKILL OUTPUT ===');
  console.log(kills.stdout || kills.stderr);

  ssh.dispose();
}

checkProc().catch(e => { console.error(e); process.exit(1); });
