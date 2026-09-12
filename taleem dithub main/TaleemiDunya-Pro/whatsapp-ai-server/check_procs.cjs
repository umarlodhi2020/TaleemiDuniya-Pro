const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkProcs() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('ps auxww | grep node');
    console.log(result.stdout);
    ssh.dispose();
}
checkProcs();
