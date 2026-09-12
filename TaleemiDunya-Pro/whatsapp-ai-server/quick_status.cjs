const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function quickCheck() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    console.log('Connected!');

    // Check running processes
    const ps = await ssh.execCommand('ps aux | grep "node server" | grep -v grep');
    console.log('Node processes:', ps.stdout || 'NONE running');

    // Check status via API
    const s1 = await ssh.execCommand('curl -s "http://localhost:4000/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs" 2>/dev/null');
    console.log('Local API status:', s1.stdout || 'NO_RESPONSE');

    // Check last 20 lines of bot.log
    const log = await ssh.execCommand('tail -20 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/bot.log 2>/dev/null');
    console.log('\nLast bot.log lines:\n', log.stdout || 'no log');

    process.exit(0);
}
quickCheck().catch(e => { console.error(e.message); process.exit(1); });
