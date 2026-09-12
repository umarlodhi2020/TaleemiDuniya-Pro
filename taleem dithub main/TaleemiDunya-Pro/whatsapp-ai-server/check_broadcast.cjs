const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkSiteLog() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const res = await ssh.execCommand('grep "BROADCAST SENT" /home/umarhayat/admin/logs/sites/2026/sites-2026-07-23.log | tail -n 10');
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkSiteLog();
