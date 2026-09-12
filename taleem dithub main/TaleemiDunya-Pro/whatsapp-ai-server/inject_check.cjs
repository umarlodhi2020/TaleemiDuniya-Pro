const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const http = require('https');

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Inject endpoint
    await ssh.execCommand("sed -i \"s/app.get('\\/api\\/session\\/status'/app.get('\\/api\\/check-db', (req, res) => res.json({ db: !!db, apps: admin.apps.length }));\\n\\napp.get('\\/api\\/session\\/status'/\" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js");
    
    // Kill processes
    await ssh.execCommand('pkill -u umarhayat node');
    await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/restart.txt');
    
    setTimeout(() => {
        http.get('https://taleemidunya-pro-ed44e.web.app/api/check-db', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log("Check DB Response:", data);
                process.exit(0);
            });
        }).on('error', (e) => {
            console.error("HTTP Error:", e.message);
            process.exit(1);
        });
    }, 5000);
}
run();
