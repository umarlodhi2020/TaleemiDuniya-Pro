const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const result = await ssh.execCommand('tail -n 100 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log');
    console.log(result.stdout);
    process.exit(0);
}
run();
