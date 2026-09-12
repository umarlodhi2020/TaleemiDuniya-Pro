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

    console.log('\n⏳ 1/4 Uploading updated server.js and serviceAccountKey.json...');
    const path = require('path');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    await ssh.putFile(path.join(__dirname, 'serviceAccountKey.json'), `${remoteDir}/serviceAccountKey.json`);
    console.log('✅ Files updated on disk.');

    console.log('\n⏳ Installing nodemailer on live server...');
    await ssh.execCommand(`cd ${remoteDir} && npm install nodemailer`);
    console.log('✅ Nodemailer installed.');

    console.log('\n⏳ 2/4 Pre-creating auth_sessions directories so container never hits ENOENT...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/auth_sessions/default_school && chmod -R 777 ${remoteDir}/auth_sessions`);
    console.log('✅ Directories pre-created and permissioned.');

    console.log('\n⏳ 3/4 Touching restart markers & killing old container instances across pool...');
    await ssh.execCommand(`touch /home/umarhayat/www/tmp/restart.txt && touch /home/umarhayat/www/restart.txt && touch ${remoteDir}/restart.txt`);
    await ssh.execCommand(`pkill -u umarhayat node 2>/dev/null || true`);
    
    console.log('\n⏳ 4/4 Triggering session start and waiting 6 seconds for fresh QR code generation...');
    await new Promise(r => setTimeout(r, 6000));

    try {
        await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school' })
        });
        await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'NNRuCtHxQNjISc9EPgMs' })
        });
        console.log('Start triggers sent for both default_school and NNRuCtHxQNjISc9EPgMs.');
    } catch (e) {}

    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
            const statusJson = await statusRes.json();
            console.log(`Live Status Check [${i+1}/6]:`, statusJson.status, statusJson.qrDataUrl ? '(QR Available)' : '');
            if (statusJson.status === 'QR_READY') break;
        } catch (e) {}
    }

    process.exit(0);
}
uploadAndRestart();
