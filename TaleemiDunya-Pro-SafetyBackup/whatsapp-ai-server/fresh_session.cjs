const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    console.log('Step 1: Deleting corrupt auth session files...');
    await ssh.execCommand('rm -rf /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/NNRuCtHxQNjISc9EPgMs');
    await ssh.execCommand('rm -rf /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/default_school');
    console.log('✅ Old corrupt sessions deleted.');

    console.log('Step 2: Triggering server restart...');
    await ssh.execCommand('touch /home/umarhayat/www/tmp/restart.txt && touch /home/umarhayat/www/restart.txt');
    console.log('✅ Restart triggered.');
    
    console.log('Step 3: Waiting 8 seconds for server to boot up...');
    await new Promise(r => setTimeout(r, 8000));
    
    console.log('Step 4: Checking if QR code is ready...');
    try {
        const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
        const data = await res.json();
        console.log('Status:', data.status);
        console.log('QR Ready?', data.qrDataUrl ? 'YES - QR code available!' : 'Not yet...');
    } catch(e) {
        console.log('Could not check status:', e.message);
    }

    ssh.dispose();
}
run();
