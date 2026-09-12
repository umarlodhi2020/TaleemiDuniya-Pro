const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });
    console.log('Connected to SSH.');

    const localFile = 'G:/taleem dithub/TaleemiDunya-Pro/whatsapp-ai-server/server.js';
    const remoteFile = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

    console.log('Uploading server.js...');
    await ssh.putFile(localFile, remoteFile);

    console.log('Final Aggressive Cleanup...');
    await ssh.execCommand('pkill -u umarhayat -9 node || true');
    await ssh.execCommand('fuser -k 8100/tcp || true');
    await ssh.execCommand('rm /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log || true');

    console.log('Waiting 10 seconds for port to clear...');
    await new Promise(r => setTimeout(r, 10000));

    console.log('Starting server...');
    const restartCmd = 'cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 nohup /usr/alwaysdata/nodejs/24/bin/node server.js > server.log 2>&1 < /dev/null &';
    await ssh.execCommand(restartCmd);

    await new Promise(r => setTimeout(r, 5000));

    const log = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
    console.log('Log output:\n', log.stdout);

    ssh.dispose();
    console.log('Deployment script finished.');
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  }
}

deploy();
