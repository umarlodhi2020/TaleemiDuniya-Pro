const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

// Alwaysdata API restart using their management API
async function restartViaAPI() {
    // Method 1: Try Alwaysdata REST API (if token available)
    try {
        const resp = await fetch('https://api.alwaysdata.com/v1/site/?format=json', {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('umarhayat:umar9900').toString('base64')
            }
        });
        const data = await resp.json();
        console.log('Sites:', JSON.stringify(data, null, 2));
    } catch(e) {
        console.log('API method failed:', e.message);
    }
}

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    console.log('Connected. Killing all node processes and letting supervisor restart...');
    
    // Kill all node processes - supervisor will auto-restart with new code
    const kill = await ssh.execCommand('pkill -9 -u umarhayat node; sleep 2; echo "killed"');
    console.log('Kill result:', kill.stdout, kill.stderr);
    
    // Wait and check if process comes back
    await new Promise(r => setTimeout(r, 5000));
    
    const ps = await ssh.execCommand('ps -ef | grep node | grep -v grep');
    console.log('Processes after restart:', ps.stdout || 'none running yet');
    
    ssh.dispose();
    
    // Now check status
    await new Promise(r => setTimeout(r, 5000));
    
    try {
        const resp = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
        const data = await resp.json();
        console.log('Live Status:', data.status, '| QR Ready:', data.qrDataUrl ? 'YES!' : 'No');
    } catch(e) {
        console.log('Status check:', e.message);
    }
}

run().then(() => restartViaAPI());
