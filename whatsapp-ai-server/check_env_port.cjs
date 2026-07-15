const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkEnvPort() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`ps aux | grep node | grep -v grep && echo "=== ENV PORT ===" && cat /proc/2300131/environ 2>/dev/null | tr '\\0' '\\n' | grep -E "PORT|ALWAYSDATA" || echo "Cannot check environ"`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkEnvPort();
