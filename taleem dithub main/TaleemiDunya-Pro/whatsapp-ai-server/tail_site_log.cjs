const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const result = await ssh.execCommand('find /home/umarhayat/admin/logs -type f -mtime -1 -exec tail -n 20 {} +');
    console.log(result.stdout);
    if(result.stderr) console.error("STDERR:", result.stderr);
    process.exit(0);
}
run();
