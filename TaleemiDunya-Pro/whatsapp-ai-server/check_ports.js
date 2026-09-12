import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });

    const netstat = await ssh.execCommand('netstat -tpln');
    console.log('Netstat:\n', netstat.stdout);

    const ps = await ssh.execCommand('ps aux | grep node');
    console.log('PS:\n', ps.stdout);

    ssh.dispose();
  } catch (error) {
    console.error(error);
  }
}

check();
