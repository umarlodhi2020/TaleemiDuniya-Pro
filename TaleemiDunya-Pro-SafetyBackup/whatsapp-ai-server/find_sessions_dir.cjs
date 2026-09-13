const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findSessions() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`find /home/umarhayat -name "auth_sessions" 2>/dev/null`);
    console.log('=== FIND RESULT ===');
    console.log(res.stdout || res.stderr || 'Not found anywhere');
    process.exit(0);
}
findSessions();
