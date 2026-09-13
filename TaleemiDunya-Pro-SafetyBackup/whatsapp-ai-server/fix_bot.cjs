const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900'});
    await ssh.execCommand('sed -i \'1s/^/const bodyParser = require("body-parser");\\n/\' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/bot.js');
    await ssh.execCommand('pkill -u umarhayat -f bot.js');
    await ssh.execCommand('cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && nohup node bot.js > server.log 2>&1 &');
    console.log('FIXED AND RESTARTED BOT');
    process.exit(0);
}
run();
