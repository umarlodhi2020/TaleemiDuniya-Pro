const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkListeningPorts() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const ss = await ssh.execCommand('ss -tlpn 2>/dev/null || netstat -tlpn 2>/dev/null');
  console.log('=== LISTENING PORTS ===\n', ss.stdout);

  // Check alwaysdata sites via API or check what port process 917987 has open
  const fds = await ssh.execCommand('ls -l /proc/917987/fd');
  console.log('=== PROCESS 917987 FDS ===\n', fds.stdout);

  process.exit(0);
}

checkListeningPorts().catch(console.error);

