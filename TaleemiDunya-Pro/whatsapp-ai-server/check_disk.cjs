const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkDisk() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  
  const df = await ssh.execCommand('df -h; echo "--- QUOTA ---"; quota -s; echo "--- DU ---"; du -sh /home/umarhayat/*');
  console.log(df.stdout);

  process.exit(0);
}

checkDisk().catch(e => {
  console.error(e);
  process.exit(1);
});

