const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' }).then(async () => {
  console.log('=== Connected ===');

  // Check www directory - this is alwaysdata's web root
  const r1 = await ssh.execCommand('ls -la /home/umarhayat/www/ 2>/dev/null');
  console.log('www dir:', r1.stdout);

  // Check if there's a Node.js site config in alwaysdata admin
  const r2 = await ssh.execCommand('ls /home/umarhayat/admin/alwrapper/ 2>/dev/null');
  console.log('alwrapper dir:', r2.stdout);

  const r3 = await ssh.execCommand('cat /home/umarhayat/admin/alwrapper/*.json 2>/dev/null | head -100');
  console.log('alwrapper json:', r3.stdout);

  // Check tmp dir for logs
  const r4 = await ssh.execCommand('ls /home/umarhayat/admin/logs/ 2>/dev/null');
  console.log('logs dir:', r4.stdout);

  // Is there a different app being served?
  const r5 = await ssh.execCommand('ls /home/umarhayat/TaleemiDunya-Pro/ 2>/dev/null');
  console.log('TaleemiDunya-Pro dir:', r5.stdout);

  // Check if there's a restart mechanism and what it runs
  const r6 = await ssh.execCommand('cat /home/umarhayat/restart.txt 2>/dev/null; ls -la /home/umarhayat/restart.txt 2>/dev/null');
  console.log('restart.txt:', r6.stdout);

  // What node binary is available
  const r7 = await ssh.execCommand('which node && node --version 2>/dev/null');
  console.log('node binary:', r7.stdout);

  // Check if main.zip has server
  const r8 = await ssh.execCommand('unzip -l /home/umarhayat/main.zip 2>/dev/null | head -20');
  console.log('main.zip contents:', r8.stdout);

  ssh.dispose();
}).catch(e => { console.error('SSH Error:', e.message); });
