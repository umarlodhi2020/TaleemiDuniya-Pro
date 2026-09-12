const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function fullReset() {
    console.log('Connecting...');
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    console.log('Connected!');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    // Kill all processes
    console.log('\n1. Killing all node...');
    await ssh.execCommand('pkill -9 -u umarhayat node 2>/dev/null; sleep 3; echo KILLED');

    // Delete ALL auth sessions completely
    console.log('\n2. Wiping ALL auth sessions...');
    await ssh.execCommand(`rm -rf ${remoteDir}/auth_sessions && mkdir -p ${remoteDir}/auth_sessions && echo WIPED`);

    // Upload server.js
    console.log('\n3. Uploading server.js...');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('Uploaded.');

    // Start server
    console.log('\n4. Starting server...');
    await ssh.execCommand(`cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && nohup node server.js >> bot.log 2>&1 &`);
    await new Promise(r => setTimeout(r, 6000));

    // Trigger session
    console.log('\n5. Triggering QR generation...');
    const r = await ssh.execCommand(`curl -s -X POST -H "Content-Type: application/json" -d '{"schoolId":"NNRuCtHxQNjISc9EPgMs"}' http://localhost:4000/api/session/start`);
    console.log('Response:', r.stdout || r.stderr);

    // Wait and check QR status
    for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const st = await ssh.execCommand(`curl -s "http://localhost:4000/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs"`);
        const parsed = JSON.parse(st.stdout || '{}');
        console.log(`[${i+1}/5] Status: ${parsed.status}`);
        if (parsed.status === 'QR_READY') {
            console.log('\n✅ QR READY! Ab dashboard se scan karein.');
            console.log('URL: https://taleemidunya-pro-ed44e.web.app');
            break;
        }
        if (parsed.status === 'CONNECTED') {
            console.log('\n✅ Already CONNECTED!');
            break;
        }
    }

    // Check logs for errors
    const log = await ssh.execCommand(`tail -15 ${remoteDir}/bot.log`);
    console.log('\nLast logs:\n', log.stdout);

    process.exit(0);
}

fullReset().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
