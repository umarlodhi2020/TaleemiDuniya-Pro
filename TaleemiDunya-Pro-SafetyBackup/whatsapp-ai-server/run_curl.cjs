const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function runCurl() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    const result = await ssh.execCommand('curl -s "http://127.0.0.1:8100/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs" || curl -s "https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs"');
    console.log("CURL OUTPUT:", result.stdout);
    ssh.dispose();
}
runCurl();
