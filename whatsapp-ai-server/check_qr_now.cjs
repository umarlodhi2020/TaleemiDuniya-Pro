const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNow() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`curl -s http://localhost:4000/api/session/status && echo "\n=== BOT LOG ===" && tail -n 20 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/bot.log`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkNow();
