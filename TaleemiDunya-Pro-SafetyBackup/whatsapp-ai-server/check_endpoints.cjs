const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkEndpoints() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('node -e "const content = require(\'fs\').readFileSync(\'/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js\', \'utf8\'); const match = content.match(/app\\.get\\(\\\'\\/api\\/session\\/status\\\'.*?\\}\\);/s); console.log(match ? match[0] : \'NOT FOUND\');"');
    console.log(result.stdout);
    ssh.dispose();
}
checkEndpoints();
