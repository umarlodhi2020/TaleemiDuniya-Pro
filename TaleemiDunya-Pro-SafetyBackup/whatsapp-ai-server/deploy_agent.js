import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to ssh-umarhayat.alwaysdata.net...');
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
    const localFile = 'G:/taleem dithub/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

    console.log(`📤 Uploading server.js to ${remoteDir}/server.js ...`);
    await ssh.putFile(localFile, `${remoteDir}/server.js`);
    console.log('✅ Upload complete.');

    console.log('🧹 Cleaning up lock files and clearing old logs...');
    await ssh.execCommand(`rm -f ${remoteDir}/auth_sessions/.lock_*`);
    await ssh.execCommand(`truncate -s 0 ${remoteDir}/server.log`);

    console.log('💀 Aggressively killing existing node and uwsgi processes...');
    await ssh.execCommand('killall -9 node || true');
    await ssh.execCommand('killall -9 uwsgi || true');
    await ssh.execCommand('pkill -9 -u umarhayat node || true');
    await ssh.execCommand('pkill -9 -u umarhayat uwsgi || true');

    console.log('⏳ Waiting 3 seconds for processes to terminate...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('🔍 Verifying no node processes are left...');
    const psCheck = await ssh.execCommand('ps -u umarhayat | grep node || echo "NONE"');
    console.log('PS Check Result:', psCheck.stdout);

    console.log('🚀 Restarting server on port 8115...');
    const restartCmd = `cd ${remoteDir} && PORT=8115 nohup node server.js > server.log 2>&1 < /dev/null &`;
    await ssh.execCommand(restartCmd);
    console.log('✅ Restart command sent.');

    ssh.dispose();
    console.log('🎊 Deployment finished successfully.');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
  }
}

deploy();
