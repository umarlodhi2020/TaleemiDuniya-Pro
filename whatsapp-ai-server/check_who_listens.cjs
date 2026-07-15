const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWhoListens() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`export PATH=$PATH:$HOME/.npm-global/bin && echo "=== PIDS ON PORT 4000 ===" && fuser 4000/tcp 2>&1 && ps aux | grep node && echo "=== LOCAL CURL ===" && curl -s http://localhost:4000/api/session/status`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkWhoListens();
