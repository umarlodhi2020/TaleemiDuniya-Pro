const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Check node syntax
    console.log('Checking syntax of remote server.js...');
    const syntax = await ssh.execCommand('cd ~/TaleemiDunya-Pro/whatsapp-ai-server && node --check server.js 2>&1');
    console.log('Syntax check:', syntax.stdout || syntax.stderr || 'OK (no output = no errors)');
    
    // Check Alwaysdata error log
    console.log('\nChecking error logs...');
    const errLog = await ssh.execCommand('find ~/admin/logs -name "*.log" -newer ~/TaleemiDunya-Pro/whatsapp-ai-server/server.js 2>/dev/null | head -5');
    console.log('Recent logs:', errLog.stdout);
    
    const errLog2 = await ssh.execCommand('ls ~/admin/logs/ 2>/dev/null || ls ~/logs/ 2>/dev/null || echo "No log dir found"');
    console.log('Log dirs:', errLog2.stdout);
    
    // Check memory/disk
    const mem = await ssh.execCommand('free -m 2>/dev/null | head -3');
    console.log('Memory:', mem.stdout);
    
    // Try starting manually to see errors
    console.log('\nTrying to start manually...');
    const manual = await ssh.execCommand('cd ~/TaleemiDunya-Pro/whatsapp-ai-server && timeout 5 node index.js 2>&1 | head -20');
    console.log('Manual start:', manual.stdout || manual.stderr);
    
    ssh.dispose();
}
check();
