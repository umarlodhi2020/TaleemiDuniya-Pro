const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkConfig() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`ls -la /home/umarhayat/admin/config /home/umarhayat/admin/config/* 2>/dev/null`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkConfig();
