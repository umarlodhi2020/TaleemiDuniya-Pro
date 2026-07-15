const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findLogs() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`export PATH=$PATH:$HOME/.npm-global/bin && find /home/umarhayat -name "*.log" -o -name "*error*" 2>/dev/null && echo "=== PS AUX ALL ===" && ps aux`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
findLogs();
