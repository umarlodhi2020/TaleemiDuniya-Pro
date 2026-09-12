const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkEtc() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const res = await ssh.execCommand(`cat /etc/alwrapper.conf 2>/dev/null`);
  console.log('=== /ETC/ALWRAPPER.CONF ===');
  console.log(res.stdout || res.stderr);

  // Check if there is anything inside /usr/alwaysdata/uwsgi/
  const uw = await ssh.execCommand(`find /usr/alwaysdata/uwsgi/ -type f 2>/dev/null | head -n 30`);
  console.log('=== UWSGI FILES ===');
  console.log(uw.stdout);

  // Check where mod_proxy_uwsgi is pointing to if we check open sockets or connection tables
  const net = await ssh.execCommand(`ss -xl | head -n 30`);
  console.log('=== UNIX SOCKETS LISTING ===');
  console.log(net.stdout);

  ssh.dispose();
}

checkEtc().catch(e => { console.error(e); process.exit(1); });
