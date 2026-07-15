const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkHistory() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`cat /home/umarhayat/.bash_history 2>/dev/null | tail -n 50`);
    console.log('=== BASH HISTORY ===');
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkHistory();
