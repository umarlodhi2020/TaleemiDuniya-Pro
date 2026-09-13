const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Read the LATEST log entries from the last 5 minutes
    console.log('=== LATEST SERVER LOG (last 100 lines) ===');
    const log = await ssh.execCommand('tail -n 100 ~/admin/logs/sites/2026/sites-2026-08-07.log 2>/dev/null');
    console.log(log.stdout || 'empty');
    
    ssh.dispose();
}
check();
