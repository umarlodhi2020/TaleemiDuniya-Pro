import { NodeSSH } from 'node-ssh';
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });

    console.log('Checking server.log...');
    const result = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
    console.log('Log Output:');
    console.log(result.stdout);

    console.log('Checking process...');
    const ps = await ssh.execCommand('ps -u umarhayat -f | grep node');
    console.log('Node processes:');
    console.log(ps.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Check failed:', err);
  }
}

check();
