const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function debugCreds() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
    const result = await ssh.execCommand(`node -e "const fs = require('fs'); const creds = JSON.parse(fs.readFileSync('${remoteDir}/auth_sessions/NNRuCtHxQNjISc9EPgMs/creds.json')); console.log(JSON.stringify(creds.me || creds, null, 2).slice(0, 500));"`);
    console.log("CREDS DUMP:");
    console.log(result.stdout);
    console.log(result.stderr);
    ssh.dispose();
}
debugCreds();
