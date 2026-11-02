const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectRunningProcess() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const pinfo = await ssh.execCommand('ls -l /proc/3091614/cwd; ls -l /proc/3091614/fd');
  console.log('=== PROCESS FD & CWD ===\n', pinfo.stdout);

  process.exit(0);
}

inspectRunningProcess().catch(e => {
  console.error(e);
  process.exit(1);
});
