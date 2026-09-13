const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    console.log('Checking what code is on server...');
    const checkNew = await ssh.execCommand('grep -c "isFuzzyGreeting" ~/TaleemiDunya-Pro/whatsapp-ai-server/server.js');
    console.log('New code deployed? (should be 1):', checkNew.stdout.trim());
    
    console.log('\nChecking running node processes...');
    const ps = await ssh.execCommand('ps -ef | grep -E "node|index" | grep -v grep');
    console.log('Processes:', ps.stdout || 'NONE');
    
    console.log('\nKilling old processes to force fresh restart with new code...');
    await ssh.execCommand('pkill -9 -u umarhayat node 2>/dev/null; true');
    
    console.log('Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
    
    const ps2 = await ssh.execCommand('ps -ef | grep node | grep -v grep');
    console.log('After kill processes:', ps2.stdout || 'Supervisor restarting...');
    
    ssh.dispose();
    
    // Wait for supervisor to start
    console.log('\nWaiting 15 seconds for supervisor to restart server...');
    await new Promise(r => setTimeout(r, 15000));
    
    const resp = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    const data = await resp.json();
    console.log('Live Status after restart:', data.status, '| Phone:', data.phone);
    console.log('QR needed?', data.status === 'QR_READY' ? 'YES - scan in portal!' : 'No');
    
    if (data.status === 'CONNECTED') {
        console.log('\n✅ Bot is connected! Now testing auto-reply message handler...');
        // Send a test through API
        const msgResp = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schoolId: 'NNRuCtHxQNjISc9EPgMs',
                phone: '923172234518',
                message: '🔄 Server restarted with fresh code! Now send "hello" to test auto-reply menu.'
            })
        });
        const msgData = await msgResp.json();
        console.log('Notification sent:', msgData.success);
    }
}
run();
