const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function cleanAndSupervisorOnly() {
    console.log('========================================================================');
    console.log('🔄 TALEEMIDUNYA PRO: SYNCHRONIZING WITH ALWAYSDATA SUPERVISOR');
    console.log('========================================================================');
    console.log('\n⏳ Connecting to Alwaysdata Cloud...');

    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    console.log('\n⏳ 1/3 Finding all running node/server.js processes and terminating them...');
    const psRes = await ssh.execCommand(`ps aux | grep -E "node|server.js" | grep -v grep | awk '{print $2}'`);
    const pids = (psRes.stdout || '').trim().split('\n').filter(Boolean);
    if (pids.length > 0) {
        console.log(`Killing PIDs: ${pids.join(', ')}`);
        await ssh.execCommand(`kill -9 ${pids.join(' ')} 2>/dev/null || true`);
    } else {
        console.log('No existing PIDs found.');
    }

    console.log('\n⏳ 2/3 Cleaning out-of-sync session keys so supervisor generates clean QR code...');
    await ssh.execCommand(`cd ${remoteDir} && rm -rf auth_sessions && sleep 3`);
    console.log('✅ Wiped sessions cleanly.');

    console.log('\n⏳ 3/3 Waiting 10 seconds for Alwaysdata official Web Sites supervisor to restart server.js on assigned PORT...');
    await new Promise(r => setTimeout(r, 10000));

    const checkPs = await ssh.execCommand(`ps aux | grep node | grep -v grep`);
    console.log('=== RUNNING SUPERVISOR NODE PROCESSES ===');
    console.log(checkPs.stdout || checkPs.stderr || 'No node process visible (or under supervisor namespace)');

    console.log('\n=== TESTING PUBLIC URL https://umarhayat.alwaysdata.net/api/session/status ===');
    try {
        const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
        const json = await res.json();
        console.log('Public Status Response:', {
            schoolId: json.schoolId,
            status: json.status,
            hasQr: !!json.qrDataUrl
        });
        if (json.status === 'QR_READY') {
            console.log('\n🎉 [COMPLETE SUCCESS] Public URL and Alwaysdata Supervisor are 100% in sync and QR Code is LIVE!');
        } else {
            console.log('\nℹ️ Status is:', json.status);
        }
    } catch (e) {
        console.error('Fetch Error:', e.message);
    }
    process.exit(0);
}
cleanAndSupervisorOnly();
