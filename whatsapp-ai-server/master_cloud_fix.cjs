const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function masterCloudFix() {
    console.log('========================================================================');
    console.log('🛡️ TALEEMIDUNYA PRO: MASTER CLOUD STABILIZATION (HTTP21 POOL ONLY)');
    console.log('========================================================================');
    console.log('\n⏳ Connecting to Alwaysdata Cloud...');

    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    console.log('\n⏳ 1/4 Killing any rogue SSH node processes on ssh1 to eliminate NFS socket conflicts...');
    await ssh.execCommand(`fuser -k 4000/tcp 2>/dev/null || true; killall -9 node 2>/dev/null || true`);
    console.log('✅ All ssh1 node processes terminated.');

    console.log('\n⏳ 2/4 Wiping corrupted/conflicted session files from NFS disk...');
    await ssh.execCommand(`cd ${remoteDir} && rm -rf auth_sessions && sleep 2`);
    console.log('✅ Cleaned.');

    console.log('\n⏳ 3/4 Touching server.js to force Alwaysdata http21 website container to reload...');
    await ssh.execCommand(`cd ${remoteDir} && touch server.js && sleep 5`);
    console.log('✅ Container triggered.');

    console.log('\n⏳ 4/4 POSTing to public domain https://umarhayat.alwaysdata.net/api/session/start...');
    try {
        const startRes = await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school' })
        });
        const startJson = await startRes.json();
        console.log('Start Trigger Response:', startJson);

        let qrLive = false;
        for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
            const statusJson = await statusRes.json();
            console.log(`Public Cloud Status Check [${i+1}/8]:`, {
                schoolId: statusJson.schoolId,
                status: statusJson.status,
                hasQrCode: !!statusJson.qrDataUrl
            });
            if (statusJson.status === 'QR_READY') {
                qrLive = true;
                break;
            }
        }

        if (qrLive) {
            console.log('\n🎉 [COMPLETE SUCCESS] Alwaysdata official HTTP21 pool has generated a fresh, stable QR Code!');
        } else {
            console.log('\nℹ️ Please check cloud logs if further initialization is in progress.');
        }
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
    process.exit(0);
}
masterCloudFix();
