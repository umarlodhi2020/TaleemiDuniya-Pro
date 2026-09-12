const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testHttp21Kill() {
    console.log('=== ATTEMPTING TO CONNECT & KILL ON HTTP21 ===');
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // First let's check if we can ssh to http21 from ssh1 or if http21 shares /proc or if we can find 3502916
    const res = await ssh.execCommand(`ssh -o StrictHostKeyChecking=no umarhayat@http21 "pkill -9 -u umarhayat node" 2>&1 || pkill -9 -f node 2>&1 || true`);
    console.log('SSH/Kill Result:', res.stdout || res.stderr);

    // Also let's check what `curl -I https://umarhayat.alwaysdata.net/api/server/reboot` returns now
    try {
        const checkRes = await fetch('https://umarhayat.alwaysdata.net/api/server/reboot', { method: 'POST' });
        console.log('Reboot route status after kill check:', checkRes.status);
    } catch (e) {
        console.log('Fetch error:', e.message);
    }

    process.exit(0);
}
testHttp21Kill();
