const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAccount() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const git = await ssh.execCommand(`git config --global -l 2>/dev/null; cat /home/umarhayat/.bash_history 2>/dev/null | grep -i "alwaysdata\\|curl\\|api\\|restart" | tail -n 25`);
  console.log('=== GIT CONFIG / BASH HISTORY ===');
  console.log(git.stdout);

  // Check all configuration files inside /home/umarhayat
  const confs = await ssh.execCommand(`find /home/umarhayat/ -maxdepth 2 -name "*.json" -o -name "*.env*" -o -name "*.conf" 2>/dev/null`);
  console.log('=== CONFIG FILES ===');
  console.log(confs.stdout);

  ssh.dispose();
}

checkAccount().catch(e => { console.error(e); process.exit(1); });
