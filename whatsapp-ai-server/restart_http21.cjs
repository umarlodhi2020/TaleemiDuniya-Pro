const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartHttp21() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
    console.log('=== UPLOADING NEW SERVER.JS & TRIGGERING HTTP21 RESTART ===');
    
    // Upload local server.js to ssh1/NFS
    const fs = require('fs');
    const localCode = fs.readFileSync('./server.js', 'utf8');
    await ssh.execCommand(`cat << 'EOF' > ${remoteDir}/server.js\n${localCode}\nEOF`);
    console.log('✅ server.js written.');

    // Touch standard restart triggers across Alwaysdata platforms
    await ssh.execCommand(`mkdir -p ${remoteDir}/tmp && touch ${remoteDir}/tmp/restart.txt && touch ${remoteDir}/restart.txt && touch /home/umarhayat/admin/restart.txt && touch /home/umarhayat/tmp/restart.txt 2>/dev/null || true`);
    console.log('✅ Restart markers touched.');

    // Also check if we can kill node across shared NFS via pkill if accessible
    await ssh.execCommand(`pkill -u umarhayat node 2>/dev/null || true`);
    console.log('✅ Sent user-wide pkill.');

    await new Promise(r => setTimeout(r, 6000));

    const logRes = await ssh.execCommand(`tail -n 15 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log`);
    console.log('=== LATEST HTTP21 SITE LOGS ===');
    console.log(logRes.stdout || logRes.stderr);

    process.exit(0);
}
restartHttp21();
