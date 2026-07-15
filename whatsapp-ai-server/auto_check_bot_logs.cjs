const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCloudLogs() {
    console.log('⏳ Connecting to Alwaysdata Cloud...');
    try {
        await ssh.connect({
            host: 'ssh-umarhayat.alwaysdata.net',
            username: 'umarhayat',
            password: 'umar9900',
            readyTimeout: 30000
        });
        const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
        console.log('✅ Connected. Fetching last 45 lines of cloud bot.log and pm2 status...\n');
        
        const res = await ssh.execCommand(`cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && (pm2 status; echo "=== LOGS ==="; pm2 logs whatsapp-bot --lines 35 --nostream 2>/dev/null || tail -n 35 bot.log)`);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
checkCloudLogs();
