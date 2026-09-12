import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function kill() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });

    console.log('Finding node and bash processes...');
    const ps = await ssh.execCommand('ps -u umarhayat -o pid,comm,args | grep -E "node|bash"');
    console.log(ps.stdout);

    // Aggressive kill
    console.log('Killing all...');
    await ssh.execCommand('pkill -u umarhayat -9 node');
    await ssh.execCommand('pkill -u umarhayat -9 bash');

    console.log('Checking port 8100...');
    await new Promise(r => setTimeout(r, 2000));
    const netstat = await ssh.execCommand('ss -tpln | grep 8100');
    console.log('Port 8100:', netstat.stdout || 'Free');

    console.log('Starting server...');
    const command = 'cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/ && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &';
    await ssh.execCommand(command);

    ssh.dispose();
  } catch (error) {
    console.error(error);
  }
}

kill();
