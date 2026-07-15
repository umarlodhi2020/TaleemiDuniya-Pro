const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function uploadAndRestart() {
    console.log('========================================================================');
    console.log('🚀 TALEEMIDUNYA PRO: FINAL CLOUD DEPLOYMENT & CONTAINER REBOOT');
    console.log('========================================================================');

    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
    const fs = require('fs');
    const localCode = fs.readFileSync('./server.js', 'utf8');

    console.log('\n⏳ 1/4 Uploading updated server.js with absolute paths and robust crash handling...');
    await ssh.execCommand(`cat << 'EOF' > ${remoteDir}/server.js\n${localCode}\nEOF`);
    console.log('✅ server.js updated on disk.');

    console.log('\n⏳ 2/4 Pre-creating auth_sessions directories so container never hits ENOENT...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/auth_sessions/default_school && chmod -R 777 ${remoteDir}/auth_sessions`);
    console.log('✅ Directories pre-created and permissioned.');

    console.log('\n⏳ 3/4 Touching restart markers & killing old container instances across pool...');
    await ssh.execCommand(`touch ${remoteDir}/tmp/restart.txt && touch ${remoteDir}/restart.txt`);
    await ssh.execCommand(`pkill -u umarhayat node 2>/dev/null || true`);
    
    console.log('\n⏳ 4/4 Triggering session start and waiting 6 seconds for fresh QR code generation...');
    await new Promise(r => setTimeout(r, 6000));

    try {
        const startRes = await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school' })
        });
        console.log('Start Trigger:', await startRes.json());
    } catch (e) {}

    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
            const statusJson = await statusRes.json();
            console.log(`Live Status Check [${i+1}/6]:`, statusJson.status, statusJson.qrDataUrl ? '(QR Available)' : '');
        } catch (e) {}
    }

    process.exit(0);
}
uploadAndRestart();
