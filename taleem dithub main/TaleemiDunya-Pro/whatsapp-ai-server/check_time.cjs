const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkTime() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('ls -la /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
    console.log(result.stdout);
    ssh.dispose();
}
checkTime();
