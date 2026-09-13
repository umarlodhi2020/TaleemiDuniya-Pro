const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function hardRestart() {
    console.log('Connecting...');
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    console.log('Connected!');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    // 1. Upload latest server.js
    console.log('\n1. Uploading server.js...');
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('✅ server.js uploaded');

    // 2. Kill ALL node processes
    console.log('\n2. Killing all node processes...');
    await ssh.execCommand('pkill -9 -u umarhayat node 2>/dev/null; sleep 2; echo KILLED');
    console.log('✅ Node processes killed');

    // 3. Check if site is running via Alwaysdata site restart
    console.log('\n3. Touching all restart markers...');
    await ssh.execCommand([
        'touch /home/umarhayat/www/tmp/restart.txt',
        'touch /home/umarhayat/www/restart.txt',
        `touch ${remoteDir}/restart.txt`,
        'echo ALL_TOUCHED'
    ].join(' && '));

    // 4. Start server fresh via nohup
    console.log('\n4. Starting fresh server via nohup...');
    const startRes = await ssh.execCommand(
        `cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && nohup node server.js >> bot.log 2>&1 & echo PID:$!`
    );
    console.log('Start result:', startRes.stdout || startRes.stderr);

    // 5. Wait for startup
    await new Promise(r => setTimeout(r, 6000));

    // 6. Check if node is running now
    const psRes = await ssh.execCommand('ps aux | grep "node server.js" | grep -v grep');
    console.log('\nNode processes now running:');
    console.log(psRes.stdout || 'NONE');

    // 7. Trigger the school session
    console.log('\n5. Triggering school session NNRuCtHxQNjISc9EPgMs...');
    const trigRes = await ssh.execCommand(
        `curl -s -X POST -H "Content-Type: application/json" -d '{"schoolId":"NNRuCtHxQNjISc9EPgMs"}' http://localhost:4000/api/session/start`
    );
    console.log('Trigger result:', trigRes.stdout || trigRes.stderr);

    // 8. Wait and check status
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await ssh.execCommand('curl -s "http://localhost:4000/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs"');
    console.log('\nSession status:', statusRes.stdout);

    console.log('\n✅ DONE! Test WhatsApp now.');
    process.exit(0);
}

hardRestart().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
