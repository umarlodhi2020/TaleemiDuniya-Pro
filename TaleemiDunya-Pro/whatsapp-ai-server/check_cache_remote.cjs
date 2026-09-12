const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const res = await ssh.execCommand('grep schoolStudentsCache /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
    console.log("CACHE CHECK ON REMOTE:\n", res.stdout);
    
    process.exit(0);
}
run();
