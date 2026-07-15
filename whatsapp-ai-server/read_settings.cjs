const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function readWrapper() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`cat /home/umarhayat/admin/config/alwrapper/settings /home/umarhayat/admin/config/profile/* /home/umarhayat/admin/config/*/* 2>/dev/null`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
readWrapper();
