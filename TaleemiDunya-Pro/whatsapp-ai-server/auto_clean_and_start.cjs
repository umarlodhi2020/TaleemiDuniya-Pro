const path = require('path');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function fixAndLaunch() {
    console.log('========================================================================');
    console.log('⚡ TALEEMIDUNYA PRO: CLOUD PORT RECOVERY & INSTANT LAUNCH');
    console.log('========================================================================');
    console.log('\n⏳ Connecting to Alwaysdata Cloud...');

    try {
        await ssh.connect({
            host: 'ssh-umarhayat.alwaysdata.net',
            username: 'umarhayat',
            password: 'umar9900',
            tryKeyboard: true,
            readyTimeout: 30000
        });
        console.log('✅ SSH Connected!');

        const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

        console.log('\n⏳ 1/3 Force killing all processes occupying Port 4000 & old PM2/Node daemons...');
        const killCmd = `export PATH=$PATH:$HOME/.npm-global/bin; fuser -k 4000/tcp 2>/dev/null || true; killall -9 node pm2 2>/dev/null || true; pm2 kill 2>/dev/null || true; sleep 2`;
        await ssh.execCommand(killCmd);
        console.log('✅ Port 4000 freed completely!');

        console.log('\n⏳ 2/3 Extracting updated 35 session files & launching whatsapp-bot...');
        const launchCmd = `cd ${remoteDir} && rm -rf auth_sessions && tar -xzf auth_sessions.tar.gz && export PATH=$PATH:$HOME/.npm-global/bin && (pm2 start server.js --name whatsapp-bot --force || nohup node server.js > bot.log 2>&1 &) && sleep 3`;
        await ssh.execCommand(launchCmd);
        console.log('✅ whatsapp-bot launched on clean Port 4000!');

        console.log('\n⏳ 3/3 Checking live status and QR/Connection logs...');
        const logRes = await ssh.execCommand(`cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && (pm2 logs whatsapp-bot --lines 20 --nostream 2>/dev/null || tail -n 20 bot.log)`);
        
        console.log('\n================ ALWAYS DATA CLOUD LIVE LOGS ================');
        console.log(logRes.stdout || logRes.stderr);
        console.log('=============================================================');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixAndLaunch();
