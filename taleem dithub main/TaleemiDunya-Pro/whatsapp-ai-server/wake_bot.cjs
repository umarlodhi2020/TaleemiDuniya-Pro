const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const http = require('https');

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Kill processes
    await ssh.execCommand('pkill -u umarhayat node');
    
    // Touch restart.txt at root
    await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/restart.txt');
    console.log("Touched restart.txt at root.");
    
    // Wake up the bot
    console.log("Waking up bot via HTTP request...");
    
    setTimeout(() => {
        http.get('https://taleemidunya-pro-ed44e.web.app/api/session/start?schoolId=default_school', (res) => {
            console.log("Wake up status:", res.statusCode);
            process.exit(0);
        }).on('error', (e) => {
            console.error("HTTP Error:", e.message);
            process.exit(1);
        });
    }, 2000);
}
run();
