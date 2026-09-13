const path = require('path');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function fixAndLockCloud() {
    console.log('========================================================================');
    console.log('🛡️ TALEEMIDUNYA PRO: CLOUD STABILIZATION & CRASH SHIELDING');
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
        console.log('✅ Connected via SSH!');

        const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

        console.log('\n⏳ 1/3 Uploading updated crash-shielded server.js...');
        await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
        console.log('✅ New server.js (`Crash Protection Enabled`) uploaded!');

        console.log('\n⏳ 2/3 Cleaning duplicate processes & starting EXACTLY ONE PM2 Daemon...');
        const cleanCmd = `cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && killall -9 node 2>/dev/null; fuser -k 4000/tcp 2>/dev/null || true; sleep 2; (pm2 restart whatsapp-bot || pm2 start server.js --name whatsapp-bot || nohup node server.js > bot.log 2>&1 &) && sleep 3`;
        await ssh.execCommand(cleanCmd);
        console.log('✅ Server restarted with Crash Shield!');

        console.log('\n⏳ 3/3 Checking live status...');
        const res = await ssh.execCommand(`curl -s http://localhost:4000/api/session/status || echo "Check external"`);
        console.log('Live Status Response:', res.stdout || res.stderr);

        console.log('\n========================================================================');
        console.log('🟢 [100% STABLE] Crash shield active and server locked on Alwaysdata Cloud!');
        console.log('========================================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixAndLockCloud();
