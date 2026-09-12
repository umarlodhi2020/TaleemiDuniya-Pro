const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartAndCheck() {
    await ssh.connect({ host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900' });
    console.log('Connected!');
    
    // Check server.log for recent errors
    const slog = await ssh.execCommand('tail -40 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log 2>/dev/null || echo NO_SERVER_LOG');
    console.log('=== server.log ===');
    console.log(slog.stdout);
    
    // Check http log for errors
    const hlog = await ssh.execCommand('tail -20 /home/umarhayat/admin/logs/http/2026/http-2026-08-07.log 2>/dev/null');
    console.log('\n=== http log ===');
    console.log(hlog.stdout);
    
    // Touch restart to trigger Alwaysdata container restart
    console.log('\n=== Touching restart.txt to trigger container restart ===');
    const restart = await ssh.execCommand('touch /home/umarhayat/www/tmp/restart.txt 2>/dev/null && touch /home/umarhayat/www/restart.txt 2>/dev/null && echo DONE');
    console.log(restart.stdout);
    
    // Wait 5 sec then check status
    await new Promise(r => setTimeout(r, 5000));
    const status = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    const json = await status.json();
    console.log('\nSession Status after restart:', json);
    
    process.exit(0);
}
restartAndCheck().catch(e => { console.error(e.message); process.exit(1); });
