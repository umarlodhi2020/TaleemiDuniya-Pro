const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function fixConflict() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    console.log('Connected!');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    // Kill all running node processes first
    console.log('\n1. Killing all node processes...');
    await ssh.execCommand('pkill -9 -u umarhayat node 2>/dev/null; sleep 3; echo DONE');
    console.log('Killed.');

    // Upload fresh server.js
    console.log('\n2. Uploading server.js...');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('Uploaded.');

    // Start server fresh
    console.log('\n3. Starting fresh server...');
    await ssh.execCommand(
        `cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && nohup node server.js >> bot.log 2>&1 &`
    );
    
    // Wait for server to boot
    await new Promise(r => setTimeout(r, 5000));

    // Trigger session with 'passive: false' - fresh active session
    console.log('\n4. Starting active session for school...');
    const r = await ssh.execCommand(
        `curl -s -X POST -H "Content-Type: application/json" -d '{"schoolId":"NNRuCtHxQNjISc9EPgMs"}' http://localhost:4000/api/session/start`
    );
    console.log('Start response:', r.stdout);

    // Wait and check
    await new Promise(r => setTimeout(r, 8000));
    const status = await ssh.execCommand('curl -s "http://localhost:4000/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs"');
    console.log('\nStatus:', status.stdout);

    // Last log lines
    const log = await ssh.execCommand('tail -10 ' + remoteDir + '/bot.log');
    console.log('\nLast logs:', log.stdout);

    console.log('\n✅ Done! Now test WhatsApp.');
    console.log('\n⚠️ IMPORTANT: Agar phone mein WhatsApp open hai aur same number use ho raha hai,');
    console.log('   toh phone mein WhatsApp > Linked Devices > "Bot/Server" disconnect kar ke');
    console.log('   dobara app se QR scan karein.');
    process.exit(0);
}

fixConflict().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
