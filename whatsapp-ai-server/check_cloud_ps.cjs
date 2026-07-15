const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCloudPs() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`ps aux | grep node`);
    console.log('=== CLOUD NODE PROCESSES ===');
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkCloudPs();
