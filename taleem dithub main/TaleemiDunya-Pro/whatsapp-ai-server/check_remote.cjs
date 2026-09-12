const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });

    console.log('Checking server.log...');
    const result = await ssh.execCommand('tail -n 20 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
    console.log('Log Output:');
    console.log(result.stdout);
    console.log(result.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('Check failed:', err);
  }
}

check();
