const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
  console.log('Connected to SSH.');

  const ports = await ssh.execCommand('netstat -tlpn 2>/dev/null || ss -tlpn 2>/dev/null || lsof -i -P -n | grep LISTEN');
  console.log('Listening ports:\n', ports.stdout);

  const ps = await ssh.execCommand('ps -eo pid,user,cmd | grep node | grep -v grep');
  console.log('Node processes:\n', ps.stdout);

  // Test local requests on AlwaysData
  const curl1 = await ssh.execCommand('curl -s http://localhost:8100/version');
  console.log('Local curl :8100/version ->', curl1.stdout);

  const curl2 = await ssh.execCommand('curl -s http://localhost:4000/version');
  console.log('Local curl :4000/version ->', curl2.stdout);

  // Test site configuration on AlwaysData
  const siteConfig = await ssh.execCommand('ls -la /home/umarhayat/www/ || true');
  console.log('~/www/ contents:\n', siteConfig.stdout);

  const cmdCgi = await ssh.execCommand('cat /home/umarhayat/www/cmd.cgi || true');
  console.log('~/www/cmd.cgi contents:\n', cmdCgi.stdout);

  ssh.dispose();
}

check().catch(console.error);
