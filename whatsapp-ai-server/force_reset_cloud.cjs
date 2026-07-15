const path = require('path');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function forceResetCloud() {
    console.log('========================================================================');
    console.log('🚀 TALEEMIDUNYA PRO: FORCE CLEAN RESET & QR GENERATOR');
    console.log('========================================================================');
    console.log('\n⏳ Connecting to Alwaysdata Cloud...');

    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    console.log('\n⏳ 1/4 Uploading new stable server.js...');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('✅ Uploaded.');

    console.log('\n⏳ 2/4 Finding and killing all running server.js processes exactly by PID...');
    const psRes = await ssh.execCommand(`ps aux | grep server.js | grep -v grep | awk '{print $2}'`);
    const pids = (psRes.stdout || '').trim().split('\n').filter(Boolean);
    if (pids.length > 0) {
        console.log(`Killing PIDs: ${pids.join(', ')}`);
        await ssh.execCommand(`kill -9 ${pids.join(' ')} 2>/dev/null || true`);
    } else {
        console.log('No existing server.js PIDs found.');
    }

    console.log('\n⏳ 3/4 Deleting corrupted/out-of-sync auth_sessions directory...');
    await ssh.execCommand(`cd ${remoteDir} && rm -rf auth_sessions && sleep 2`);
    console.log('✅ Session data wiped.');

    console.log('\n⏳ 4/4 Launching clean detached server daemon & checking QR code...');
    await ssh.execCommand(`cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && (pm2 restart whatsapp-bot || pm2 start server.js --name whatsapp-bot || nohup node server.js > bot.log 2>&1 &)`);
    
    let qrReady = false;
    for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 2500));
        const res = await ssh.execCommand(`curl -s http://localhost:4000/api/session/status`);
        console.log(`Status Check [${i+1}/8]:`, res.stdout || res.stderr);
        if (res.stdout && res.stdout.includes('QR_READY')) {
            qrReady = true;
            break;
        }
    }

    if (qrReady) {
        console.log('\n🎉 [COMPLETE SUCCESS] Fresh QR Code generated and waiting for scan!');
    } else {
        console.log('\nℹ️ Check bot logs for details.');
    }
    process.exit(0);
}
forceResetCloud();
