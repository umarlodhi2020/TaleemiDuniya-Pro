const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function killAndCheck() {
    console.log('Connecting...');
    try {
        await ssh.connect({
            host: 'ssh-umarhayat.alwaysdata.net',
            username: 'umarhayat',
            password: 'umar9900',
            tryKeyboard: true
        });
        console.log('Connected. Killing all server.js processes...');
        await ssh.execCommand('pkill -9 -f server.js');
        await ssh.execCommand('pkill -9 -f node');
        
        console.log('Starting single nohup instance...');
        const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
        await ssh.execCommand(`cd ${remoteDir} && nohup /usr/alwaysdata/nodejs/24/bin/node server.js > bot.log 2>&1 &`);
        
        console.log('Checking running processes...');
        const res = await ssh.execCommand('ps -ef | grep server.js');
        console.log('Processes:', res.stdout || res.stderr);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
killAndCheck();
