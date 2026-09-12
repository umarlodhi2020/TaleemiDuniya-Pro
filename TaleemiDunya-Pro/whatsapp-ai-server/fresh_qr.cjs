const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function freshQR() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    console.log('Connected!');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    // Step 1: Kill all node processes
    console.log('\n1. Killing old processes...');
    await ssh.execCommand('pkill -9 -u umarhayat node 2>/dev/null; sleep 2; echo DONE');
    console.log('Done.');

    // Step 2: Delete old auth session to force fresh QR
    console.log('\n2. Deleting old session data...');
    await ssh.execCommand(`rm -rf ${remoteDir}/auth_sessions/NNRuCtHxQNjISc9EPgMs && echo DELETED`);
    console.log('Old session deleted - fresh QR will be generated.');

    // Step 3: Upload latest server.js
    console.log('\n3. Uploading latest server.js...');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('Uploaded.');

    // Step 4: Start server fresh
    console.log('\n4. Starting fresh server...');
    await ssh.execCommand(`cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && nohup node server.js >> bot.log 2>&1 &`);
    await new Promise(r => setTimeout(r, 5000));

    // Step 5: Trigger session start
    console.log('\n5. Triggering fresh QR generation...');
    const r = await ssh.execCommand(`curl -s -X POST -H "Content-Type: application/json" -d '{"schoolId":"NNRuCtHxQNjISc9EPgMs"}' http://localhost:4000/api/session/start`);
    console.log('Session start response:', r.stdout);

    // Step 6: Wait and get QR status
    await new Promise(r => setTimeout(r, 5000));
    const status = await ssh.execCommand(`curl -s "http://localhost:4000/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs"`);
    console.log('\nSession Status:', status.stdout);

    console.log('\n✅ DONE!');
    console.log('Ab apni website ka WhatsApp Bot dashboard kholein');
    console.log('aur wahan QR code scan karein apne phone se!');
    process.exit(0);
}

freshQR().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
