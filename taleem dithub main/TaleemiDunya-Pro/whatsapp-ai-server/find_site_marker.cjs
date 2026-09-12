const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findMarker() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Let's check the exact supervisor command that launched 3502916 from the site log or alwrapper settings
    const logRes = await ssh.execCommand(`grep -i -E 'command|restart|exec|start|pid|root|working' /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log | tail -n 30`);
    console.log('=== SITE LAUNCH PATTERNS ===');
    console.log(logRes.stdout || logRes.stderr);

    // Also check if alwrapper has any scripts or if there are any other configuration files under /home/umarhayat/admin/config/
    const findRes = await ssh.execCommand(`find /home/umarhayat/admin -type f 2>/dev/null`);
    console.log('=== ALL ADMIN FILES ===');
    console.log(findRes.stdout || findRes.stderr);
    process.exit(0);
}
findMarker();
