const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    console.log('Running npm install @whiskeysockets/baileys@latest...');
    const res = await ssh.execCommand('cd ~/TaleemiDunya-Pro/whatsapp-ai-server && npm install @whiskeysockets/baileys@latest');
    console.log('NPM OUT:', res.stdout);
    console.log('NPM ERR:', res.stderr);
    
    await ssh.execCommand('touch /home/umarhayat/www/tmp/restart.txt && touch /home/umarhayat/www/restart.txt');
    console.log('Restart triggered.');
    ssh.dispose();
}
run();
