const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check194950() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const ps = await ssh.execCommand(`ps -fp 194950 2>/dev/null || cat /proc/194950/cmdline | tr "\\0" " " 2>/dev/null || lsof -p 194950 2>/dev/null || echo "Cannot inspect 194950 directly via ps"`);
  console.log('=== PID 194950 INFO ===');
  console.log(ps.stdout || ps.stderr);

  // Check what processes ARE running under our user umarhayat right now
  const allUser = await ssh.execCommand(`ps -u umarhayat -o pid,ppid,cmd`);
  console.log('=== ALL USER PROCESSES ===');
  console.log(allUser.stdout);

  // Can we restart the site via alwaysdata CLI or API?
  const cliHelp = await ssh.execCommand(`alwaysdata --help 2>/dev/null || ad --help 2>/dev/null || echo "No CLI"`);
  console.log('=== CLI HELP ===');
  console.log(cliHelp.stdout);

  // Check if there is a restart script in /home/umarhayat/admin
  const adminScripts = await ssh.execCommand(`find /home/umarhayat/admin -type f`);
  console.log('=== ADMIN SCRIPTS ===');
  console.log(adminScripts.stdout);

  ssh.dispose();
}

check194950().catch(e => { console.error(e); process.exit(1); });
