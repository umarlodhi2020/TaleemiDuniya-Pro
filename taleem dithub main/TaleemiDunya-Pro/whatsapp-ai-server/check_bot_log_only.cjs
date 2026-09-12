const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLog() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`tail -n 40 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/bot.log 2>/dev/null || echo "No bot.log"`);
    console.log('=== BOT.LOG ===');
    console.log(res.stdout || res.stderr);
    
    // Also check if any QR file exists or if creds.json was created
    const fileRes = await ssh.execCommand(`ls -la /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/default_school 2>/dev/null || echo "No auth_sessions folder yet"`);
    console.log('=== SESSION DIR ===');
    console.log(fileRes.stdout || fileRes.stderr);
    process.exit(0);
}
checkLog();
