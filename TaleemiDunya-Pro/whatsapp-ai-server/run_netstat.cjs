const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function runNetstat() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('netstat -lntp 2>/dev/null || ss -lntp 2>/dev/null');
    console.log(result.stdout);
    ssh.dispose();
}
runNetstat();
