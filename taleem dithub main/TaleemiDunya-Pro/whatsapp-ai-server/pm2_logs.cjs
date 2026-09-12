const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const res = await ssh.execCommand('pm2 logs --lines 50 --nostream');
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    process.exit(0);
}
run();
