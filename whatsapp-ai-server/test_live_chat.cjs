const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCurrentBotLog() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && export PATH=$PATH:$HOME/.npm-global/bin && echo "=== PM2 STATUS ===" && pm2 status && echo "=== TAIL BOT.LOG ===" && tail -n 25 bot.log`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkCurrentBotLog();
