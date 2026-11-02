const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkTmpSizes() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const res = await ssh.execCommand('du -sh /home/umarhayat/admin/tmp/*');
  console.log(res.stdout);

  process.exit(0);
}

checkTmpSizes().catch(e => {
  console.error(e);
  process.exit(1);
});
