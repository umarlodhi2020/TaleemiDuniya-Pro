const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAndTrigger() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Check if 3502916 is still logged in supervisor or if a new PID exists
    const logRes = await ssh.execCommand(`tail -n 15 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log`);
    console.log('=== LATEST LOGS ===');
    console.log(logRes.stdout || logRes.stderr);

    // Hit the site 10 times to trigger restart poll
    for (let i = 0; i < 5; i++) {
        try {
            await fetch('https://umarhayat.alwaysdata.net/');
            await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=default_school');
        } catch (e) {}
    }

    const logRes2 = await ssh.execCommand(`tail -n 15 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log`);
    console.log('=== AFTER HIT LOGS ===');
    console.log(logRes2.stdout || logRes2.stderr);

    process.exit(0);
}
checkAndTrigger();
