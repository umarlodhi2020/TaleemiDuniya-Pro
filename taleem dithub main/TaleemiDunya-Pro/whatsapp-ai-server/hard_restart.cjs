const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Kill all node processes
    await ssh.execCommand('pkill -u umarhayat node');
    await ssh.execCommand('killall -9 node');
    
    // Check if tmp directory exists, if so touch restart.txt
    const checkTmp = await ssh.execCommand('ls -la /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server');
    console.log(checkTmp.stdout);
    
    await ssh.execCommand('mkdir -p /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp');
    await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt');
    
    console.log("Restart attempted.");
    process.exit(0);
}
run();
