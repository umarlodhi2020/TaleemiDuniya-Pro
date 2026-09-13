import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting...');
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });

    console.log('Replacing server.js...');
    await ssh.putFile(
      'G:/taleem dithub/TaleemiDunya-Pro/whatsapp-ai-server/server.js',
      '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js'
    );

    console.log('Aggressive kill...');
    await ssh.execCommand('pkill -9 -u umarhayat node');
    await ssh.execCommand('pkill -9 -u umarhayat uwsgi');
    await ssh.execCommand('fuser -k 8100/tcp');

    console.log('Waiting 10 seconds for OS to release port...');
    await new Promise(r => setTimeout(r, 10000));

    console.log('Starting...');
    await ssh.execCommand('cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &');

    console.log('Waiting 15 seconds for startup...');
    await new Promise(r => setTimeout(r, 15000));

    console.log('Verifying...');
    const result = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
    console.log('Logs:\n', result.stdout);

    if (result.stdout.includes('v4')) {
        console.log('SUCCESS: v4 is active.');
    } else {
        console.log('FAILURE: v4 not found in logs.');
    }

    ssh.dispose();
  } catch (error) {
    console.error('Error:', error);
    ssh.dispose();
  }
}

deploy();
