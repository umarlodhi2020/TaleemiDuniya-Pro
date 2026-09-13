const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkRes() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('node -e "console.log(require(\'fs\').readFileSync(\'/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js\', \'utf8\').substring(24500, 25500));"');
    console.log(result.stdout);
    ssh.dispose();
}
checkRes();
