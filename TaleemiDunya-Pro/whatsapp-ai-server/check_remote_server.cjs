const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const res = await ssh.execCommand('grep -A 10 "Database connect nahi ho saka" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
    console.log("SERVER.JS on ALWAYSDATA:\n", res.stdout);
    
    process.exit(0);
}
run();
