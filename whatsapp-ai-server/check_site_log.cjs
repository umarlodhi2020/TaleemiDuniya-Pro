const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSiteLog() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`tail -n 35 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkSiteLog();
