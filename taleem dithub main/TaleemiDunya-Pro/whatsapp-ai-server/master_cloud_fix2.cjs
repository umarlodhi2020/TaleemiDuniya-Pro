const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixDuplicateBots() {
    console.log('Connecting...');
    try {
        await ssh.connect({
            host: 'ssh-umarhayat.alwaysdata.net',
            username: 'umarhayat',
            password: 'umar9900',
            tryKeyboard: true
        });
        console.log('Connected. Killing all node processes...');
        await ssh.execCommand('killall -9 node');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Cleaning and starting a fresh single instance with nohup...');
        const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
        const startCmd = `cd ${remoteDir} && nohup node server.js > bot.log 2>&1 &`;
        const res = await ssh.execCommand(startCmd);
        
        console.log('Nohup Result:', res.stdout || res.stderr);
        console.log('Done!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fixDuplicateBots();
