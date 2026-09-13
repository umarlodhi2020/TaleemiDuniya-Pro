const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900'});
    const r1 = await ssh.execCommand('cat /home/umarhayat/.gitconfig');
    const r2 = await ssh.execCommand('cat /home/umarhayat/.bash_history | grep -i "@gmail"');
    console.log('GIT:', r1.stdout, 'HISTORY:', r2.stdout);
    process.exit(0);
}
run();
