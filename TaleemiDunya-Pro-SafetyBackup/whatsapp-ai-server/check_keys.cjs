const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkCreds() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('node -e "const c = require(\'/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/NNRuCtHxQNjISc9EPgMs/creds.json\'); console.log(\'has me:\', !!c.me, \'keys:\', Object.keys(c).join(\',\'));"');
    console.log(result.stdout);
    ssh.dispose();
}
checkCreds();
