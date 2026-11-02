const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkTmp() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const res = await ssh.execCommand('ls -lh /home/umarhayat/admin/tmp | head -n 30; echo "--- TOTAL FILES ---"; ls -1 /home/umarhayat/admin/tmp | wc -l');
  console.log(res.stdout);

  process.exit(0);
}

checkTmp().catch(e => {
  console.error(e);
  process.exit(1);
});
