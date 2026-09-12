import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to AlwaysData...');
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });
    console.log('Connected!');

    const localPath = path.join(__dirname, 'server.js');
    const remotePath = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

    console.log('Uploading server.js...');
    await ssh.putFile(localPath, remotePath);
    console.log('Uploaded!');

    console.log('Killing old node processes...');
    await ssh.execCommand('pkill -9 -u umarhayat node || killall -9 node || true');
    // Wait a bit for port to release
    await new Promise(r => setTimeout(r, 2000));
    console.log('Old processes killed.');

    console.log('Restarting server...');
    const startCommand = 'cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &';
    await ssh.execCommand(startCommand);
    console.log('Server started in background.');

    ssh.dispose();
    console.log('Deployment complete.');
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  }
}

deploy();
