const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkConfig() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`ls -la /home/umarhayat /home/umarhayat/.config /home/umarhayat/admin 2>/dev/null`);
    console.log(res.stdout || res.stderr);
    
    // Also check if we can restart site by checking crontab or systemd user services
    const cronRes = await ssh.execCommand(`crontab -l 2>/dev/null || systemctl --user list-units 2>/dev/null || true`);
    console.log('=== SYSTEM/CRON SERVICES ===');
    console.log(cronRes.stdout || cronRes.stderr);
    process.exit(0);
}
checkConfig();
