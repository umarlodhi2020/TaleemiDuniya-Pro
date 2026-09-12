const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLocalCurl() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`curl -s http://localhost:4000/api/session/status`);
    console.log('=== LOCAL CURL RESPONSE ===');
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkLocalCurl();
