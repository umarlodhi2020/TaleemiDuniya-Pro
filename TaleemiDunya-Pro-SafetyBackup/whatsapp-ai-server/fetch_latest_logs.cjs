const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const res = await ssh.execCommand('find /home/umarhayat/admin/logs/sites -type f -mtime -1 -exec tail -n 50 {} +');
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    process.exit(0);
}
run();
