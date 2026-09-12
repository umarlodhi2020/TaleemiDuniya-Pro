const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkPkg() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/package.json');
    console.log(result.stdout);
    ssh.dispose();
}
checkPkg();
