const path = require('path');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function resetCloudAndGenerateQR() {
    console.log('========================================================================');
    console.log('🔄 TALEEMIDUNYA PRO: RESETTING CONFLICTED WHATSAPP SESSION');
    console.log('========================================================================');
    console.log('\n⏳ Connecting to Alwaysdata Cloud...');

    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    console.log('\n⏳ 1/3 Uploading updated server.js with clean reconnect handling...');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('✅ Updated server.js uploaded.');

    console.log('\n⏳ 2/3 Cleaning out-of-sync session keys & restarting server...');
    const cmd = `cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && killall -9 node 2>/dev/null; fuser -k 4000/tcp 2>/dev/null || true; rm -rf auth_sessions && sleep 2 && (pm2 restart whatsapp-bot || pm2 start server.js --name whatsapp-bot || nohup node server.js > bot.log 2>&1 &) && sleep 4`;
    await ssh.execCommand(cmd);
    console.log('✅ Server restarted with clean session directory!');

    console.log('\n⏳ 3/3 Checking QR Code Generation...');
    let qrGenerated = false;
    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await ssh.execCommand(`curl -s http://localhost:4000/api/session/status`);
        console.log(`Status Check [${i+1}/6]:`, res.stdout || res.stderr);
        if (res.stdout && res.stdout.includes('QR_READY')) {
            qrGenerated = true;
            break;
        }
    }

    if (qrGenerated) {
        console.log('\n🎉 [SUCCESS] Fresh QR Code generated on Alwaysdata Cloud!');
    } else {
        console.log('\nℹ️ Please check live URL or logs.');
    }
    process.exit(0);
}
resetCloudAndGenerateQR();
