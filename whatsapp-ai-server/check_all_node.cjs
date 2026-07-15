const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAllNode() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`ps -ef | grep node | grep -v grep`);
    console.log('=== ALL NODE PROCESSES ON SSH1 ===');
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkAllNode();
