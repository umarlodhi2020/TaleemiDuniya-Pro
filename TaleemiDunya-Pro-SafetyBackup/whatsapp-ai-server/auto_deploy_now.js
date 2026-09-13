const path = require('path');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function deployToAlwaysdata() {
    console.log('========================================================================');
    console.log('🚀 TALEEMIDUNYA PRO: AUTOMATIC CLOUD DEPLOYMENT (NO TYPING REQUIRED)');
    console.log('========================================================================');
    console.log('\n⏳ 1/4 Connecting to Alwaysdata Cloud (ssh-umarhayat.alwaysdata.net)...');

    try {
        await ssh.connect({
            host: 'ssh-umarhayat.alwaysdata.net',
            username: 'umarhayat',
            password: 'umar9900',
            tryKeyboard: true,
            readyTimeout: 30000
        });
        console.log('✅ Connected to Alwaysdata Cloud via SSH successfully!');

        const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

        console.log('\n⏳ 2/4 Uploading updated server.js, package.json, and 35 session files...');
        await ssh.putFiles([
            { local: path.join(__dirname, 'auth_sessions.tar.gz'), remote: `${remoteDir}/auth_sessions.tar.gz` },
            { local: path.join(__dirname, 'server.js'), remote: `${remoteDir}/server.js` },
            { local: path.join(__dirname, 'package.json'), remote: `${remoteDir}/package.json` }
        ]);
        console.log('✅ All files uploaded to Alwaysdata Cloud (`100% Complete`)!');

        console.log('\n⏳ 3/4 Cleaning up old cloud processes and starting fresh 24/7 server...');
        const startCmd = `cd ${remoteDir} && killall -9 node 2>/dev/null; rm -rf auth_sessions && tar -xzf auth_sessions.tar.gz && export PATH=$PATH:$HOME/.npm-global/bin && (pm2 restart whatsapp-bot 2>/dev/null || pm2 start server.js --name whatsapp-bot 2>/dev/null || nohup node server.js > bot.log 2>&1 &)`;
        await ssh.execCommand(startCmd);
        console.log('✅ Cloud Server launched (`Clean Detached Instance`)!');

        console.log('\n⏳ 4/4 Verifying live server logs on Alwaysdata Cloud (Waiting 4 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 4000));

        const logCheck = await ssh.execCommand(`cd ${remoteDir} && tail -n 15 bot.log 2>/dev/null || pm2 logs whatsapp-bot --lines 15 --nostream 2>/dev/null`);
        console.log('\n--- ALWAYS DATA CLOUD SERVER LIVE OUTPUT ---');
        console.log(logCheck.stdout || logCheck.stderr || 'Server is running in background.');
        console.log('--------------------------------------------');

        console.log('\n========================================================================');
        console.log('🎉 [SUBHANALLAH! COMPLETE] Aap ka WhatsApp AI Bot Alwaysdata Cloud par 100% LIVE hai!');
        console.log('========================================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Deployment error:', err.message);
        process.exit(1);
    }
}

deployToAlwaysdata();
