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
        
        console.log('Waiting 5 seconds to let Alwaysdata supervisor auto-restart...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('Checking running node processes...');
        const res = await ssh.execCommand('ps -ef | grep node');
        
        console.log('Processes:', res.stdout || res.stderr);
        console.log('Done!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fixDuplicateBots();
