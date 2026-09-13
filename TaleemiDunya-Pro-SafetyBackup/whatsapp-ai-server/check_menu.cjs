const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const res = await ssh.execCommand('cat ~/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
    const code = res.stdout;
    console.log('Contains text menu?', code.includes('WELCOME TO TALEEMIDUNYA PRO SCHOOL'));
    console.log('Contains interactive?', code.includes("type: 'interactive'"));
    
    ssh.dispose();
}
check();
