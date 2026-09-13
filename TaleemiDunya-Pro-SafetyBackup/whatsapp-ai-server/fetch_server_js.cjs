const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const result = await ssh.execCommand('cat /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
    console.log(result.stdout.substring(0, 1500)); // Log the beginning of the file
    process.exit(0);
}
run();
