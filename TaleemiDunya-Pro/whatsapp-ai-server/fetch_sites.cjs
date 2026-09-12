const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const res = await ssh.execCommand('curl -s -u "umarhayat:umar9900" https://api.alwaysdata.com/v1/site/');
    console.log(res.stdout);
    
    process.exit(0);
}
run();
